define([
    'lodash',
    'bpc/store/Mediator',
    'primutils/utils/nestedPropertyAccessors',
    'src/portfolios/portfolioPerformanceScorecardV2/portfolioPerformanceScorecardConstants',
    'packages/capitalPlanning/gridColumns/fieldSummarizer',
    'hbr!src/portfolios/portfolioPerformanceScorecardV2/view/templates/icon.hbs',
    'shared/logicalDataTypeConstants',
    'shared/constants/logicalDataTypes',
    'shared/fields/valueIndicatorComparator',
    'shared/spriteMapWidget/indicatorIconFileMap',
    'shared/indicatorUtils'
], function (_, BaseMediator, accessors, constants, fieldSummarizer, iconTemplate,
             logicalDataTypeConstants, logicalDataTypes, valueIndicatorComparator,
             indicatorIconFileMap, indicatorUtils) {
    'use strict';

    const getCostColumnDataIndices = (store) => {
        const columns = store.getMetadata().columns[constants.meta.PORTFOLIO_SCORECARD_DETAILS];
        const dataIndices = _.reduce(columns, (result, column, dataIndex) => {
            if (_.includes(logicalDataTypeConstants.COST_TYPES, column.logicalDataType)) {
                result.push(dataIndex);
            }
            return result;
        }, []);
        return dataIndices;
    };

    const codesRegExp = new RegExp(constants.keys.codeKey);

    return class PortfolioPerformanceScorecardMediator extends BaseMediator {
        constructor (store, widget, options) {
            super(store, widget, options);
            this.measuresColumns = store.measuresPortfolioColumns;
            this.costColumnDataIndices = getCostColumnDataIndices(store);
            this.updatePortfolioSummaryRollups(store);
            const subscribable = this.store._subscribable;
            subscribable.on(constants.eventNames.SUMMARIZE_PORTFOLIO_GRID, (store) => {
                this.updatePortfolioSummaryRollups(this.store);
            });
        }

        // eslint-disable-next-line class-methods-use-this
        placeRecord (item) {
            const rowsetId = _.includes(constants.records.TOP_RECORDS, item.itemType) ?
                constants.gridLayout.portfolioListFixedRowset : constants.gridLayout.flexRowset;
            return {
                rowsetId : rowsetId,
                table : '$tbody'
            };
        }

        // eslint-disable-next-line class-methods-use-this
        getValueFromRecord (record, dataIndex) {
            if (_.includes(this.measuresPortfolioColumns, dataIndex)) {
                const measureAttribute = record[dataIndex + 'Attr'];
                if (!_.isUndefined(measureAttribute)) {
                    return _.isUndefined(record[dataIndex]) ? null : record[dataIndex];// constants.values.EMPTY_MANUAL_MEASURE;
                }
                if (_.isUndefined(record[dataIndex]) && record.itemType !== constants.types.PORTFOLIO_SUMMARY) {
                    return constants.keys.NOT_APPLICABLE;
                }
            }
            if (codesRegExp.test(dataIndex)) {
                dataIndex = constants.codeType.CO_CODE_TYPE + parseInt(dataIndex.replace('codeValues.', ''), 10);
            }
            return accessors.getValue(record, dataIndex);
        }

        getRecordAttributes (record, defaultAttributes) {
            const attributes = super.getRecordAttributes(record, defaultAttributes);
            attributes.editable = this.checkRecordEditPermission(record);
            attributes.locked = this.checkLockedPermissions(record);
            attributes.dataIcons = {};

            _.forEach(record, (col, prop) => {
                if (record[prop + 'Attr'] !== undefined) {
                    const siIcon = indicatorUtils.getIcon(record[prop + 'Attr'].statusIndicatorIcon);
                    const siIconColor = record[prop + 'Attr'].statusIndicatorColor;
                    attributes.dataIcons[prop] = this.makeIcon(siIcon, siIconColor);
                }
            });
            attributes.dataIcons = _.assign(attributes.dataIcons, this.lookupRecordIcons(record));
            return attributes;
        }

        getReadonlyFields (item) {
            const readonlyFields = [];
            const columns = this.store.getMetadata().columns[constants.meta.PORTFOLIO_SCORECARD_DETAILS];
            const measureColumns = this.store.getMetadata().columns[constants.meta.PORTFOLIOS];
            const portfoliomcHelper = this.store.getPortfolioListMultiCurrencyHelper();
            if (portfoliomcHelper.getCurrencyOfRecord().toUpperCase() !== portfoliomcHelper.getCurrentCurrencyType().toUpperCase() ||
                parseInt(this.store.context.currency.id, 10) !== item.workspaceCurrencyId) {
                _.forEach(columns, (column, dataIndex) => {
                    if (_.includes(logicalDataTypes.COST_TYPES, column.logicalDataType)) {
                        readonlyFields.push(dataIndex);
                    }
                });
            }
            if (portfoliomcHelper.getCurrentCurrencyType() !== 'base') {
                _.forEach(measureColumns, (column, dataIndex) => {
                    if (column.measureColumn && column.logicalDataType === logicalDataTypeConstants.COST) {
                        readonlyFields.push(dataIndex);
                    }
                });
            }
            return readonlyFields;
        }

        updateRecord (record, key, val) {
            if (codesRegExp.test(key)) {
                key = constants.codeType.CO_CODE_TYPE + parseInt(key.replace('codeValues.', ''), 10);
            }
            super.updateRecord(record, key, val);
        }

        // eslint-disable-next-line class-methods-use-this
        checkRecordEditPermission (record) {
            return !(_.includes(constants.records.TOP_RECORDS, record.itemType) || !!record.privileges &&
                record.privileges[constants.privileges.CAN_EDIT] === false);
        }

        checkLockedPermissions (record) {
            let lockedColumns = record.privileges && !record.privileges.canViewCosts ? this.costColumnDataIndices : [];
            if (record.privileges && !record.privileges.canViewFundCosts) {
                lockedColumns = _.union(lockedColumns, constants.fields.FUND_PRIVILEGE_FIELDS);
            }
            if (record.privileges && !record.privileges[constants.privileges.CAN_VIEW_COSTS]) {
                lockedColumns = _.union(lockedColumns, this.store.costMeasureFields);
            }
            return lockedColumns;
        }

        lookupRecordIcons (item) {
            const icons = {};
            const addIcon = (fieldName, indicator, bubbleColor) => {
                if (indicator != null) {
                    if (!_.has(icons, fieldName)) {
                        icons[fieldName] = {};
                    }
                    icons[fieldName] = indicatorIconFileMap(indicator, bubbleColor);
                }
            };

            if (!_.isEmpty(item.kpis) && !(_.includes(constants.records.TOP_RECORDS, item.itemType))) {
                this.projectValueIndicatorComparator = valueIndicatorComparator(item.kpis.CAPITAL_PLAN,
                    this.store.getPortfolioColumnDefinition.bind(this.store), 'CAPITAL_PLAN', null,
                    this.store.getPortfolioListMultiCurrencyHelper());
                this.projectValueIndicatorComparator(item, addIcon);
            }
            return icons;
        }

        // eslint-disable-next-line class-methods-use-this
        makeIcon (statusIndicatorIcon, statusIndicatorColor) {
            return iconTemplate({
                icon : 'indicator-' + statusIndicatorIcon,
                color : statusIndicatorColor
            });
        }

        updatePortfolioSummaryRollups (store) {
            const portfolios = store.items(constants.types.PORTFOLIO);
            const portfoliosToSummarize = _.omit(portfolios, (item) => item.id === constants.types.PORTFOLIO_SUMMARY);
            const meta = store.items(constants.types.META)[0];
            const columns = _.omit(_.assign({}, meta.columns[constants.meta.PORTFOLIOS],
                meta.columns[constants.meta.PORTFOLIO_SCORECARD_DETAILS],
                meta.columns[constants.meta.FN_FUND_TOTAL_COST]), 'name', 'workspaceName', 'addedBy', 'lastModifiedBy');
            _.forEach(columns, (columnDefinition, fieldName) => {
                const summarize = fieldSummarizer({
                    columnDefinition : columnDefinition,
                    multicurrencyHelper : this.store.getPortfolioListMultiCurrencyHelper(),
                    getValueFromRecord : (record) => this.getValueFromRecord(record, fieldName)
                });
                summarize.summaryCalculationType = columnDefinition.summaryCalculationType;
                const unfilteredValue = summarize(portfoliosToSummarize);
                store.update(constants.types.PORTFOLIO, constants.types.PORTFOLIO_SUMMARY, fieldName,
                    unfilteredValue, true);
            });
            this.updateProjectSummaryOnPrivileges();
        }

        updateProjectSummaryOnPrivileges () {
            const costPrivileges = this.store.context.privileges.canViewCosts;
            if (!costPrivileges) {
                _.forEach(this.costColumnDataIndices, (data) => this.store.update(
                    constants.types.PORTFOLIO, constants.types.PORTFOLIO_SUMMARY, data, 0, true)
                );
            }
        }
    };
});
