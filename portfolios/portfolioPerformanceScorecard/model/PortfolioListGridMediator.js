define([
    'lodash',
    'bpc/store/Mediator',
    'primutils/utils/nestedPropertyAccessors',
    'packages/capitalPlanning/gridColumns/fieldSummarizer',
    'src/portfolios/portfolioPerformanceScorecard/portfolioPerformanceScorecardConstants',
    'shared/indicatorUtils',
    'hbr!src/portfolios/portfolioPerformanceScorecard/view/templates/icon.hbs',
    'shared/logicalDataTypeConstants',
    'shared/constants/logicalDataTypes',
    'shared/fields/valueIndicatorComparator',
    'shared/spriteMapWidget/indicatorIconFileMap'
], function (_, BaseMediator, accessors, fieldSummarizer, constants, indicatorUtils, iconTemplate, logicalDataTypeConstants,
    logicalDataTypes, valueIndicatorComparator, indicatorIconFileMap) {
    'use strict';

    var MEASURE_COLUMNS = constants.columns.columnMeasures;
    // eslint-disable-next-line prefer-regex-literals
    var codesRegExp = new RegExp('codeValues.');

    function PortfolioListGridMediator (store, widget, options) {
        BaseMediator.call(this, store, widget, options);
        this.costColumnDataIndices = getCostColumnDataIndices(store);
        this.updatePortfolioSummaryRollups(store);
        this.initListeners();
    }

    function getCostColumnDataIndices (store) {
        var columns = store.getMetadata().columns[constants.meta.PORTFOLIO_SCORECARD_DETAILS],
            dataIndices = _.reduce(columns,
                function (result, column, dataIndex) {
                    if (_.includes(logicalDataTypeConstants.COST_TYPES, column.logicalDataType)) {
                        result.push(dataIndex);
                    }
                    return result;
                }, []);

        return dataIndices || [];
    }

    PortfolioListGridMediator.prototype = _.assign(Object.create(BaseMediator.prototype), {
        constructor : PortfolioListGridMediator,

        initListeners : function () {
            if (this._listenersInitialized) {
                return;
            }

            var that = this;
            var subscribable = this.store._subscribable;
            subscribable.off(constants.eventNames.SUMMARIZE_PORTFOLIO_GRID).on(constants.eventNames.SUMMARIZE_PORTFOLIO_GRID, function (store) {
                that.updatePortfolioSummaryRollups(that.store);
            });
            this._listenersInitialized = true;
        },

        placeRecord : function (item) {
            var strRowSetId = constants.gridLayout.flexRowset;
            if (item.id === constants.types.RESTRICTED_PORTFOLIO_COUNT || item.id === constants.types.PORTFOLIO_SUMMARY) {
                strRowSetId = constants.gridLayout.portfolioListFixedRowset;
            }
            return {
                rowsetId : strRowSetId,
                table : '$tbody'
            };
        },
        checkRecordEditPermission : function (record) {
            //returns true if the record should be editable; false otherwise
            var canEdit = true;
            if (record.id === constants.types.PORTFOLIO_SUMMARY || record.id === constants.types.RESTRICTED_PORTFOLIO_COUNT ||
                !!record.privileges && record.privileges[constants.privileges.CAN_EDIT] === false) {
                canEdit = false;
            }
            return canEdit;
        },

        getRecordAttributes : function (record, defaultAttributes) {
            var that = this;
            var attributes = BaseMediator.prototype.getRecordAttributes.apply(this, arguments);
            attributes.editable = that.checkRecordEditPermission(record);
            attributes.locked = this.checkLockedPermissions(record);
            attributes.dataIcons = {};

            _.forEach(record, function (col, prop) {
                if (record[prop + 'Attr'] !== undefined) {
                    var siIcon = record[prop + 'Attr'].statusIndicatorIcon;
                    siIcon = indicatorUtils.getIcon(siIcon);
                    var siIconColor = record[prop + 'Attr'].statusIndicatorColor;
                    attributes.dataIcons[prop] = that.makeIcon(siIcon, siIconColor);
                }
            });
            var recordIcons = {};

            if (record.id !== constants.types.PORTFOLIO_SUMMARY) {
                recordIcons = this.lookupRecordIcons(record);
            }
            attributes.dataIcons = _.assign(attributes.dataIcons, recordIcons);

            return attributes;
        },

        getRecordCount : function () {
            return this.store.count(this.type) - 1;
        },

        getReadonlyFields : function (item) {
            var readonlyFields = [];
            var columns = this.store.getMetadata().columns[constants.meta.PORTFOLIO_SCORECARD_DETAILS],
                measureColumns = this.store.getMetadata().columns[constants.meta.PORTFOLIOS],
                portfoliomcHelper = this.store.getPortfolioListMultiCurrencyHelper();
            if (portfoliomcHelper.getCurrencyOfRecord().toUpperCase() !== portfoliomcHelper.getCurrentCurrencyType().toUpperCase() ||
                Number(this.store.context.currency.id) !== item.workspaceCurrencyId) {
                _.forEach(columns, function (column, dataIndex) {
                    if (_.includes(logicalDataTypes.COST_TYPES, column.logicalDataType)) {
                        readonlyFields.push(dataIndex);
                    }
                });
            }
            if (portfoliomcHelper.getCurrentCurrencyType() !== 'base') {
                _.forEach(measureColumns, function (column, dataIndex) {
                    if (column.measureColumn && column.logicalDataType === logicalDataTypeConstants.COST) {
                        readonlyFields.push(dataIndex);
                    }
                });
            }
            return readonlyFields;
        },

        getValueFromRecord : function (record, dataIndex) {
            if (_.includes(MEASURE_COLUMNS, dataIndex)) {
                var measureAttribute = record[dataIndex + 'Attr'];
                if (!_.isUndefined(measureAttribute)) {
                    return _.isUndefined(record[dataIndex]) ? null : record[dataIndex];// constants.values.EMPTY_MANUAL_MEASURE;
                }
                if (_.isUndefined(record[dataIndex]) && record.id !== constants.types.PORTFOLIO_SUMMARY) {
                    return constants.keys.NOT_APPLICABLE;
                }
            }
            if (codesRegExp.test(dataIndex)) {
                dataIndex = parseInt(dataIndex.replace('codeValues.', ''), 10);
                dataIndex = constants.codeType.CO_CODE_TYPE.concat(dataIndex);
            }
            return accessors.getValue(record, dataIndex);
        },

        /**
         * @param record
         * @param key
         * @param val
         * @override
         */
        updateRecord : function (record, key, val) {
            // eslint-disable-next-line prefer-regex-literals
            var codesRegExp = new RegExp('codeValues.');
            if (codesRegExp.test(key)) {
                //workaround due to modified dataIndex being used
                key = parseInt(key.replace('codeValues.', ''), 10);
                key = constants.codeType.CO_CODE_TYPE.concat(key);
                BaseMediator.prototype.updateRecord.call(this, record, key, val);
                return;
            }
            BaseMediator.prototype.updateRecord.apply(this, arguments);
        },

        makeIcon : function (statusIndicatorIcon, statusIndicatorColor) {
            return iconTemplate({
                icon : 'indicator-' + statusIndicatorIcon,
                color : statusIndicatorColor
            });
        },

        checkLockedPermissions : function (record) {
            var lockedColumns = record.privileges && !record.privileges.canViewCosts ? this.costColumnDataIndices : [];
            if (record.privileges && !record.privileges.canViewFundCosts) {
                lockedColumns = _.union(lockedColumns, constants.fields.FUND_PRIVILEGE_FIELDS);
            }
            if (record.privileges && !record.privileges[constants.privileges.CAN_VIEW_COSTS]) {
                lockedColumns = _.union(lockedColumns, this.store.costMeasureFields);
            }
            return lockedColumns;
        },

        updatePortfolioSummaryRollups : function (store) {
            var that = this,
                portfolios = _.clone(store.items(constants.types.PORTFOLIO)),
                portfoliosToSummarize = _.omit(portfolios, function (item) {
                    return item.id === constants.types.PORTFOLIO_SUMMARY;
                }),
                meta = store.items(constants.types.META)[0],
                columns = _.omit(_.assign({}, meta.columns[constants.meta.PORTFOLIOS], meta.columns[constants.meta.PORTFOLIO_SCORECARD_DETAILS],
                    meta.columns[constants.meta.FN_FUND_TOTAL_COST]),
                'name', 'workspaceName', 'addedBy', 'lastModifiedBy');
            this.summarizers = _.reduce(columns, function (res, columnDefinition, fieldName) {
                res[fieldName] = fieldSummarizer({
                    columnDefinition : columnDefinition,
                    multicurrencyHelper : that.store.getPortfolioListMultiCurrencyHelper(),
                    getValueFromRecord : function (record) {
                        return that.getValueFromRecord(record, fieldName);
                    }
                });
                res[fieldName].summaryCalculationType = columnDefinition.summaryCalculationType;
                return res;
            }, {});

            _.forEach(columns, function (columnDefinition, fieldName) {
                var summarizer = that.summarizers[fieldName],
                    unfilteredValue = summarizer(portfoliosToSummarize);
                store.update(constants.types.PORTFOLIO, constants.types.PORTFOLIO_SUMMARY, fieldName, unfilteredValue, true);
            });
            this.updateProjectSummaryOnPrivileges();
        },

        lookupRecordIcons : function (item) {
            var icons = {};
            var that = this,
                Ids = [constants.types.PORTFOLIO_SUMMARY, constants.types.RESTRICTED_PORTFOLIO_COUNT];

            function addIcon (fieldName, indicator, bubbleColor) {
                if (indicator != null) {
                    if (!_.has(icons, fieldName)) {
                        icons[fieldName] = {};
                    }
                    icons[fieldName] = indicatorIconFileMap(indicator, bubbleColor);
                }
            }

            if (!_.isEmpty(item.kpis) && !_.includes(Ids, item.id)) {
                this.projectValueIndicatorComparator = valueIndicatorComparator(item.kpis.CAPITAL_PLAN,
                    _.bind(that.store.getPortfolioColumnDefinition, that.store), 'CAPITAL_PLAN', null, that.store.getPortfolioListMultiCurrencyHelper());

                this.projectValueIndicatorComparator(item, addIcon);
            }
            return icons;
        },

        updateProjectSummaryOnPrivileges : function () {
            var that = this,
                costPrivileges = this.store.context.privileges.canViewCosts;
            if (!costPrivileges) {
                _.forEach(this.costColumnDataIndices, function (data) {
                    that.store.update(constants.types.PORTFOLIO, constants.types.PORTFOLIO_SUMMARY, data, 0, true);
                });
            }
        }

    });

    return PortfolioListGridMediator;
});
