define([
    'lodash',
    'bpc/store/Mediator',
    'src/portfolios/portfolioPerformanceScorecard/portfolioPerformanceScorecardConstants',
    'packages/capitalPlanning/gridColumns/fieldSummarizer',
    'shared/logicalDataTypeConstants',
    'shared/filter/filterFactory',
    'shared/fields/valueIndicatorComparator',
    'shared/spriteMapWidget/indicatorIconFileMap',
    'hbr!src/projectInventory/view/templates/icon.hbs',
    'primutils/utils/nestedPropertyAccessors',
    'shared/indicatorUtils'
], function (_, BaseMediator, constants, fieldSummarizer, logicalDataTypeConstants, filterFactory, valueIndicatorComparator,
             indicatorIconFileMap, iconTemplate, accessors, indicatorUtils) {
    'use strict';

    function PortfolioPerformanceScorecardMediator (store, widget, options) {
        BaseMediator.call(this, store, widget, options);
        this.updateProjectSummaryRollups();
        this.costColumnDataIndices = getCostColumnDataIndices(store);
        var that = this;
        store.on({
            'filter-updated' : function () {
                that.updateProjectSummaryRollups();
                that.clean();
            },
            saved : function () {
                that.updateProjectSummaryRollups();
                that.clean();
            }
        });
    }

    function getCostColumnDataIndices (store) {
        var metadata = store.getMetadata().columns,
            columns = _.assign({}, metadata[constants.meta.CO_PROJECT], metadata[constants.meta.CO_CODE_TYPE_DATA]);
        var dataIndices = _.reduce(columns,
            function (result, column, dataIndex) {
                if ((_.includes(logicalDataTypeConstants.COST_TYPES, column.logicalDataType) &&
                    column.logicalDataType !== logicalDataTypeConstants.MULTICURRENCY_COST) || dataIndex === constants.fields.COST_PERF_INDEX) {
                    result.push(dataIndex);
                }
                return result;
            }, []);

        return dataIndices || [];
    }

    PortfolioPerformanceScorecardMediator.prototype = _.assign(Object.create(BaseMediator.prototype), {
        constructor : PortfolioPerformanceScorecardMediator,
        placeRecord : function (item) {
            if (_.includes([constants.types.PROJECT_SUMMARY, constants.types.RESTRICTED_PROJECTS], item.id)) {
                return {
                    rowsetId : constants.gridLayout.fixedRowset,
                    table : '$tbody'
                };
            }
            return {
                rowsetId : constants.gridLayout.flexRowset,
                table : '$tbody'
            };
        },

        getValueFromRecord : function (item, fieldName) {
            var value = null;
            if (item === null) {
                return value;
            }
            var projectMeasures = this.store.getMetadata().columns[constants.meta.PROJECT_MEASURE];
            if (item.id !== constants.types.PROJECT_SUMMARY && projectMeasures && projectMeasures[fieldName]) {
                var measureAttribute = item[fieldName + 'Attr'];
                if ((!_.isUndefined(measureAttribute))) {
                    return _.isUndefined(item[fieldName]) ? null : item[fieldName];
                }
                if (item[fieldName] === undefined) {
                    return constants.keys.NOT_APPLICABLE;
                }
            }
            value = accessors.getValue(item, fieldName);
            if (fieldName === 'parentId') {
                value = item.parentName;
            }
            return value;
        },

        checkRecordEditPermissions : function (record) {
            var isRecordEditable = true;
            if (record.id === constants.types.PROJECT_SUMMARY || record.id === constants.types.RESTRICTED_PROJECTS ||
                !!record.privileges && record.privileges.canEdit === false) {
                isRecordEditable = false;
            }
            return isRecordEditable;
        },
        getGroupingStructure : function (args) {
            args.config.getHierarchyKey = function (value) {
                if (value == null) {
                    return value;
                }
                return value.id;
            };
            args.defaults.structure = this.store.items(args.dataIndex);
            args.config.toLevel = 1000;
            return args.defaults;
        },

        makeIcon : function (statusIndicatorIcon, statusIndicatorColor) {
            return iconTemplate({
                icon : 'indicator-' + statusIndicatorIcon,
                color : statusIndicatorColor
            });
        },

        getRecordAttributes : function (record, defaultAttributes) {
            var attributes = BaseMediator.prototype.getRecordAttributes.apply(this, arguments);
            attributes.locked = this.checkLockedPermissions(record);
            if (!this.checkRecordEditPermissions(record)) {
                attributes.editable = false;
            }
            this.dataIcons = {};
            if (this.dataIcons[record.id] != null) {
                //update summary icons, as items could have been filtered out and the total no longer meets threshold
                if (record.id === constants.types.PROJECT_SUMMARY) {
                    this.dataIcons[record.id] = this.lookupRecordIcons(record);
                }
                attributes.dataIcons = this.dataIcons[record.id];
            } else {
                var recordIcons = this.lookupRecordIcons(record);
                attributes.dataIcons = recordIcons;
                this.dataIcons[record.id] = recordIcons;
            }
            this.addMeasureAttributes(record, attributes);
            return attributes;
        },

        addMeasureAttributes : function (item, attributes) {
            var that = this;
            _.forEach(item, function (col, prop) {
                var recordKeyAttr = prop + 'Attr';
                if (item[recordKeyAttr] !== undefined) {
                    var siIcon = item[recordKeyAttr].statusIndicatorIcon;
                    siIcon = indicatorUtils.getIcon(siIcon);
                    var siIconColor = item[recordKeyAttr].statusIndicatorColor;
                    attributes.dataIcons[prop] = that.makeIcon(siIcon, siIconColor);
                }
            });
        },

        getRecordCount : function () {
            var records = [];
            this.iterateStore(function (item) {
                if (this.isProjectRecord(item)) {
                    records.push(item);
                }
            }, this);
            return records.length;
        },

        isProjectRecord : function (record) {
            return !_.includes([constants.types.PROJECT_SUMMARY, constants.types.RESTRICTED_PROJECTS], record.id);
        },

        getReadonlyFields : function (record) {
            var readonlyFields = [];
            var columns = this.store.getMetadata().columns[constants.meta.CO_PROJECT],
                measureColumns = this.store.getMetadata().columns[constants.meta.PROJECT_MEASURE],
                projectmcHelper = this.store.getProjectListMultiCurrencyHelper();
            if ((!!record.privileges && !record.privileges.canEditCosts) || projectmcHelper.getCurrentCurrencyType() !== 'base') {
                _.forEach(columns, function (column, dataIndex) {
                    if (column.logicalDataType === logicalDataTypeConstants.FLEX_COST) {
                        readonlyFields.push(dataIndex);
                    }
                });
                _.forEach(measureColumns, function (column, dataIndex) {
                    if (column.logicalDataType === logicalDataTypeConstants.COST) {
                        readonlyFields.push(dataIndex);
                    }
                });
            }

            _.forEach(columns, function (column, dataIndex) {
                if (column.logicalDataType === logicalDataTypeConstants.FLEX_MULTICURRENCY_COST) {
                    readonlyFields.push(dataIndex);
                }
            });

            _.forEach(constants.columns.earnedValueFields, function (columnName) {
                if (!_.includes(['costPerfIndex', 'schedPerfIndex'], columnName)) {
                    readonlyFields.push(columnName);
                }
            });

            if (this.type === constants.types.BUDGET_APPROVED_PROJECTS && this.store.item(constants.types.PROJECTS, record.id) === null) {
                readonlyFields.push('review');
            }

            if (this.type === constants.types.RESOURCE_APPROVED_PROJECTS && this.store.item(constants.types.PROJECTS, record.id) === null) {
                readonlyFields.push('review');
            }

            return readonlyFields;
        },

        checkLockedPermissions : function (record) {
            var projectColumns = _.filter(this.costColumnDataIndices, function (col) {
                return !_.includes(constants.fields.FUNDS_FIELDS, col);
            });
            var lockedColumns = record.privileges && !record.privileges.canViewCosts ? projectColumns : [];
            if (record.privileges && !record.privileges.canViewFundCosts) {
                lockedColumns = _.union(lockedColumns, constants.fields.FUND_PRIVILEGE_FIELDS);
            }
            return lockedColumns;
        },

        iterateStore : function (functionToRun, thisContext, args) {
            var check = this.store.projectFilter,
                filterFn = this.generatorFilterFunction(),
                ids = [constants.types.PROJECT_SUMMARY, constants.types.RESTRICTED_PROJECTS];
            if (check === constants.projectFilterTypes.BUDGET_APPROVED || check === constants.projectFilterTypes.RESOURCE_APPROVED) {
                var type = this.getTypeFromFilterType(check);
                _.forEach(this.store.items(type), function (item) {
                    if (_.includes(ids, item.id) || filterFn(item)) {
                        functionToRun.call(thisContext, item, args);
                    }
                });
            } else {
                _.forEach(this.store.items(constants.types.PROJECTS), function (item) {
                    if (_.includes(ids, item.id) || ((check === constants.projectFilterTypes.ALL ||
                        check === constants.projectFilterTypes.REVIEW && item.review) && filterFn(item))) {
                        functionToRun.call(thisContext, item, args);
                    }
                });
            }
        },

        getRecordsToGroup : function () {
            var check = this.store.projectFilter,
                filterFn = this.generatorFilterFunction();
            if (check === constants.projectFilterTypes.BUDGET_APPROVED || check === constants.projectFilterTypes.RESOURCE_APPROVED) {
                var type = this.getTypeFromFilterType(check);
                return this.store.items(type, function (record) {
                    return !_.includes([constants.types.PROJECT_SUMMARY, constants.types.RESTRICTED_PROJECTS], record.id) && filterFn(record);
                });
            }
            return this.store.items(constants.types.PROJECTS, function (record) {
                return !_.includes([constants.types.PROJECT_SUMMARY, constants.types.RESTRICTED_PROJECTS], record.id) &&
                        ((check === constants.projectFilterTypes.ALL || check === constants.projectFilterTypes.BUDGET_APPROVED ||
                        (check === constants.projectFilterTypes.REVIEW && record.review)) && filterFn(record));
            });
        },

        updateProjectSummaryRollups : function () {
            if (this.store.count(constants.types.PROJECTS) > 0) {
                var that = this,
                    type = this.getTypeFromFilterType(this.store.projectFilter);
                var unfilteredProjects = [];
                this.iterateStore(function (item) {
                    if (item.id !== constants.types.PROJECT_SUMMARY) {
                        unfilteredProjects.push(item);
                    }
                });
                var columns = this.store.getMetadata().columns;
                var projectColumns = _.omit(_.merge(columns[constants.meta.CO_PROJECT], columns[constants.meta.RM_DEMAND_COST_R],
                    columns[constants.meta.RM_DEMAND_R], columns[constants.meta.SA_PROJ_ALIGN_SCORE],
                    columns[constants.meta.FN_FUND_TOTAL_COST]
                ), 'name', 'review', 'code', 'status', 'strgyPriorityNum', 'riskLevel', 'isTemplateFlag', 'allocated', 'unallocated');
                this.summarizers = _.reduce(projectColumns, function (res, columnDefinition, fieldName) {
                    res[fieldName] = fieldSummarizer({
                        columnDefinition : columnDefinition,
                        multicurrencyHelper : that.store.getProjectListMultiCurrencyHelper(),
                        getValueFromRecord : function (record) {
                            return that.getValueFromRecord(record, fieldName);
                        }
                    });
                    res[fieldName].summaryCalculationType = columnDefinition.summaryCalculationType;
                    return res;
                }, {});

                _.forEach(projectColumns, function (columnDefinition, fieldName) {
                    var summarizer = that.summarizers[fieldName];
                    that.store.item(type, constants.types.PROJECT_SUMMARY)[fieldName] = summarizer(unfilteredProjects);
                });
            }
        },

        getUserFilter : function () {
            return this.store.getFilter();
        },

        applyUserFilter : function (filter) {
            return this.store.setFilter(filter);
        },

        generatorFilterFunction : function () {
            var columns = this.store.getMetadata().columns,
                that = this,
                projectColumns = _.assign({}, columns[constants.meta.RM_DEMAND_R], columns[constants.meta.RM_DEMAND_COST_R], columns[constants.meta.CO_PROJECT],
                    columns[constants.meta.SA_PROJ_ALIGN_SCORE], columns[constants.meta.CO_CODE_TYPE_DATA]);
            return filterFactory(this.store.getFilter(), {
                allFields : projectColumns,
                getValue : function (item, fieldName) {
                    var column = _.get(projectColumns, fieldName),
                        fieldValue;
                    if (column != null) {
                        if (column.logicalDataType === 'MULTICURRENCY_COST') {
                            return that.store.getProjectListMultiCurrencyHelper().getCost(item[fieldName]);
                        }
                        if (fieldName === constants.fields.OWNER) {
                            fieldValue = _.cloneDeep(item[fieldName]);
                            fieldValue.id = fieldValue.id.slice(0, fieldValue.id.indexOf(constants.owner_converter.separator + constants.owner_converter.type));
                            return fieldValue;
                        }
                    }
                    return _.get(item, fieldName);
                }
            });
        },

        lookupRecordIcons : function (item) {
            var icons = {};
            var that = this;
            this.projectValueIndicatorComparator = valueIndicatorComparator(this.store.items(constants.types.KPI),
                _.bind(that.store.getColumnDefinition, that.store), 'PROJECT', null, that.store.getProjectListMultiCurrencyHelper());
            this.projectSummaryValueIndicatorComparator = valueIndicatorComparator(this.store.items(constants.types.KPI),
                _.bind(that.store.getColumnDefinition, that.store), 'PROJECT_SUMMARY', null, that.store.getProjectListMultiCurrencyHelper());

            function addIcon (fieldName, indicator, bubbleColor) {
                if (indicator != null) {
                    if (!_.has(icons, fieldName)) {
                        icons[fieldName] = {};
                    }
                    icons[fieldName] = indicatorIconFileMap(indicator, bubbleColor);
                }
            }

            if (item.id === constants.types.PROJECT_SUMMARY) {
                this.projectSummaryValueIndicatorComparator(item, addIcon);
            } else {
                this.projectValueIndicatorComparator(item, addIcon);
            }
            return icons;
        },

        updateRecord : function (record, dataIndex, value) {
            if (!_.includes(this.getReadonlyFields(record), dataIndex)) {
                BaseMediator.prototype.updateRecord.apply(this, arguments);
            }
        },

        rollupValues : function (values) {
            return this.store.getProjectListMultiCurrencyHelper().getTotal(values);
        },

        getTypeFromFilterType : function (filterType) {
            var type;
            switch (filterType) {
                case constants.projectFilterTypes.BUDGET_APPROVED:
                    type = constants.types.BUDGET_APPROVED_PROJECTS;
                    break;
                case constants.projectFilterTypes.RESOURCE_APPROVED:
                    type = constants.types.RESOURCE_APPROVED_PROJECTS;
                    break;
                default:
                    type = constants.types.PROJECTS;
            }

            return type;
        }
    });

    return PortfolioPerformanceScorecardMediator;
});
