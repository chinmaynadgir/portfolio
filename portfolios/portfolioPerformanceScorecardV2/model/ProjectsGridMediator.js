define([
    'lodash',
    'bpc/store/Mediator',
    'src/portfolios/portfolioPerformanceScorecardV2/portfolioPerformanceScorecardConstants',
    'packages/capitalPlanning/gridColumns/fieldSummarizer',
    'shared/logicalDataTypeConstants',
    'shared/filter/filterFactory',
    'shared/fields/valueIndicatorComparator',
    'shared/spriteMapWidget/indicatorIconFileMap',
    'hbr!src/portfolios/portfolioPerformanceScorecardV2/view/templates/icon.hbs',
    'primutils/utils/nestedPropertyAccessors',
    'shared/indicatorUtils'
], function (_, BaseMediator, constants, fieldSummarizer, logicalDataTypeConstants, filterFactory, valueIndicatorComparator,
             indicatorIconFileMap, iconTemplate, accessors, indicatorUtils) {
    'use strict';

    const getCostColumnDataIndices = (store) => {
        const metadata = store.getMetadata().columns;
        const columns = _.assign({}, metadata[constants.meta.CO_PROJECT], metadata[constants.meta.CO_CODE_TYPE_DATA]);
        const dataIndices = _.reduce(columns, (result, column, dataIndex) => {
            if ((_.includes(logicalDataTypeConstants.COST_TYPES, column.logicalDataType) &&
                column.logicalDataType !== logicalDataTypeConstants.MULTICURRENCY_COST) || dataIndex === constants.fields.COST_PERF_INDEX) {
                result.push(dataIndex);
            }
            return result;
        }, []);
        return dataIndices;
    };

    return class ProjectsGridMediator extends BaseMediator {
        constructor (store, widget, options) {
            super(store, widget, options);
            this.updateProjectSummaryRollups();
            this.costColumnDataIndices = getCostColumnDataIndices(store);
            this.dataIcons = {};
        }

        // eslint-disable-next-line class-methods-use-this
        placeRecord (item) {
            const isFixedRowset = _.includes([constants.types.PROJECT_SUMMARY,
                constants.types.RESTRICTED_PROJECTS], item.id);
            return {
                rowsetId : isFixedRowset ? constants.gridLayout.fixedRowset : constants.gridLayout.flexRowset,
                table : '$tbody'
            };
        }

        // eslint-disable-next-line class-methods-use-this
        getValueFromRecord (record, dataIndex) {
            let value = null;
            if (record == null) {
                return value;
            }
            const projectMeasures = this.store.getMetadata().columns[constants.meta.PROJECT_MEASURE];
            if (record.id !== constants.types.PROJECT_SUMMARY && projectMeasures && projectMeasures[dataIndex]) {
                const measureAttribute = record[dataIndex + 'Attr'];
                if ((!_.isUndefined(measureAttribute))) {
                    return _.isUndefined(record[dataIndex]) ? null : record[dataIndex];
                }
                if (record[dataIndex] === undefined) {
                    return constants.keys.NOT_APPLICABLE;
                }
            }
            value = accessors.getValue(record, dataIndex);
            if (dataIndex === 'parentId') {
                value = record.parentName;
            }
            return value;
        }

        // eslint-disable-next-line class-methods-use-this
        checkRecordEditPermissions (record) {
            return (record.id === constants.types.PROJECT_SUMMARY ||
                record.id === constants.types.RESTRICTED_PROJECTS ||
                (!!record.privileges && record.privileges.canEdit === false));
        }

        getGroupingStructure (args) {
            args.config.getHierarchyKey = (value) => (value == null ? value : value.id);
            args.defaults.structure = this.store.items(args.dataIndex);
            args.config.toLevel = 1000;
            return args.defaults;
        }

        // eslint-disable-next-line class-methods-use-this
        makeIcon (statusIndicatorIcon, statusIndicatorColor) {
            return iconTemplate({
                icon : 'indicator-' + statusIndicatorIcon,
                color : statusIndicatorColor
            });
        }

        getRecordAttributes (record, defaultAttributes) {
            const attributes = super.getRecordAttributes(record, defaultAttributes);
            attributes.locked = this.checkLockedPermissions(record);
            if (this.checkRecordEditPermissions(record)) {
                attributes.editable = false;
            }
            if (this.dataIcons[record.id] != null) {
                //update summary icons, as items could have been filtered out and the total no longer meets threshold
                if (record.id === constants.types.PROJECT_SUMMARY) {
                    this.dataIcons[record.id] = this.lookupRecordIcons(record);
                }
                attributes.dataIcons = this.dataIcons[record.id];
            } else {
                const recordIcons = this.lookupRecordIcons(record);
                attributes.dataIcons = recordIcons;
                this.dataIcons[record.id] = recordIcons;
            }
            this.addMeasureAttributes(record, attributes);
            return attributes;
        }

        addMeasureAttributes (item, attributes) {
            _.forEach(item, (col, prop) => {
                const recordKeyAttr = prop + 'Attr';
                if (item[recordKeyAttr] !== undefined) {
                    const siIcon = indicatorUtils.getIcon(item[recordKeyAttr].statusIndicatorIcon);
                    const siIconColor = item[recordKeyAttr].statusIndicatorColor;
                    attributes.dataIcons[prop] = this.makeIcon(siIcon, siIconColor);
                }
            });
        }

        getRecordCount () {
            const records = [];
            this.iterateStore((item) => {
                if (this.isProjectRecord(item)) {
                    records.push(item);
                }
            }, this);
            return records.length;
        }

        // eslint-disable-next-line class-methods-use-this
        isProjectRecord (record) {
            return !_.includes([constants.types.PROJECT_SUMMARY, constants.types.RESTRICTED_PROJECTS],
                record.id);
        }

        getReadonlyFields (record) {
            const readonlyFields = [];
            const columns = this.store.getMetadata().columns[constants.meta.CO_PROJECT];
            const measureColumns = this.store.getMetadata().columns[constants.meta.PROJECT_MEASURE];
            const projectmcHelper = this.store.getProjectListMultiCurrencyHelper();
            if ((!!record.privileges && !record.privileges.canEditCosts) || projectmcHelper.getCurrentCurrencyType() !== 'base') {
                _.forEach(columns, (column, dataIndex) => {
                    if (column.logicalDataType === logicalDataTypeConstants.FLEX_COST) {
                        readonlyFields.push(dataIndex);
                    }
                });
                _.forEach(measureColumns, (column, dataIndex) => {
                    if (column.logicalDataType === logicalDataTypeConstants.COST) {
                        readonlyFields.push(dataIndex);
                    }
                });
            }

            _.forEach(columns, (column, dataIndex) => {
                if (column.logicalDataType === logicalDataTypeConstants.FLEX_MULTICURRENCY_COST) {
                    readonlyFields.push(dataIndex);
                }
            });

            _.forEach(constants.columns.earnedValueFields, (columnName) => {
                if (!_.includes(['costPerfIndex', 'schedPerfIndex'], columnName)) {
                    readonlyFields.push(columnName);
                }
            });

            if (_.includes([constants.types.BUDGET_APPROVED_PROJECTS,
                constants.types.RESOURCE_APPROVED_PROJECTS], this.type) && this.store.item(
                constants.types.PROJECTS, record.id) === null) {
                readonlyFields.push('review');
            }

            return readonlyFields;
        }

        checkLockedPermissions (record) {
            const projectColumns = _.filter(this.costColumnDataIndices, (col) => (
                !_.includes(constants.fields.FUNDS_FIELDS, col)));
            let lockedColumns = (record.privileges && !record.privileges.canViewCosts) ? projectColumns : [];
            if (record.privileges && !record.privileges.canViewFundCosts) {
                lockedColumns = _.union(lockedColumns, constants.fields.FUND_PRIVILEGE_FIELDS);
            }
            return lockedColumns;
        }

        iterateStore (functionToRun, thisContext, args) {
            const check = this.store.projectFilter;
            const filterFn = this.generatorFilterFunction();
            const ids = [constants.types.PROJECT_SUMMARY, constants.types.RESTRICTED_PROJECTS];
            if (check === constants.projectFilterTypes.BUDGET_APPROVED || check === constants.projectFilterTypes.RESOURCE_APPROVED) {
                const type = this.getTypeFromFilterType(check);
                _.forEach(this.store.items(type), (item) => {
                    if (_.includes(ids, item.id) || filterFn(item)) {
                        functionToRun.call(thisContext, item, args);
                    }
                });
            } else {
                _.forEach(this.store.items(constants.types.PROJECTS), (item) => {
                    if (_.includes(ids, item.id) || ((check === constants.projectFilterTypes.ALL ||
                        check === constants.projectFilterTypes.REVIEW && item.review) && filterFn(item))) {
                        functionToRun.call(thisContext, item, args);
                    }
                });
            }
        }

        getRecordsToGroup () {
            const check = this.store.projectFilter;
            const filterFn = this.generatorFilterFunction();
            if (check === constants.projectFilterTypes.BUDGET_APPROVED || check === constants.projectFilterTypes.RESOURCE_APPROVED) {
                const type = this.getTypeFromFilterType(check);
                return this.store.items(type, (record) => !_.includes([constants.types.PROJECT_SUMMARY,
                    constants.types.RESTRICTED_PROJECTS], record.id) && filterFn(record));
            }
            return this.store.items(constants.types.PROJECTS,
                (record) => !_.includes([constants.types.PROJECT_SUMMARY, constants.types.RESTRICTED_PROJECTS], record.id) &&
                    ((check === constants.projectFilterTypes.ALL || check === constants.projectFilterTypes.BUDGET_APPROVED ||
                        (check === constants.projectFilterTypes.REVIEW && record.review)) && filterFn(record))
            );
        }

        updateProjectSummaryRollups () {
            if (this.store.count(constants.types.PROJECTS) > 0) {
                const type = this.getTypeFromFilterType(this.store.projectFilter);
                const unfilteredProjects = [];
                this.iterateStore((item) => {
                    if (item.id !== constants.types.PROJECT_SUMMARY) {
                        unfilteredProjects.push(item);
                    }
                });
                const columns = this.store.getMetadata().columns;
                const projectColumns = _.omit(_.merge(columns[constants.meta.CO_PROJECT], columns[constants.meta.RM_DEMAND_COST_R],
                    columns[constants.meta.RM_DEMAND_R], columns[constants.meta.SA_PROJ_ALIGN_SCORE],
                    columns[constants.meta.FN_FUND_TOTAL_COST]
                ), 'name', 'review', 'code', 'status', 'strgyPriorityNum', 'riskLevel', 'isTemplateFlag', 'allocated', 'unallocated');
                this.summarizers = _.reduce(projectColumns, (res, columnDefinition, fieldName) => {
                    res[fieldName] = fieldSummarizer({
                        columnDefinition : columnDefinition,
                        multicurrencyHelper : this.store.getProjectListMultiCurrencyHelper(),
                        getValueFromRecord : (record) => this.getValueFromRecord(record, fieldName)
                    });
                    res[fieldName].summaryCalculationType = columnDefinition.summaryCalculationType;
                    return res;
                }, {});

                _.forEach(projectColumns, (columnDefinition, fieldName) => {
                    const summarizer = this.summarizers[fieldName];
                    this.store.item(type, constants.types.PROJECT_SUMMARY)[fieldName] = summarizer(unfilteredProjects);
                });
            }
        }

        getUserFilter () {
            return this.store.getFilter();
        }

        applyUserFilter (filter) {
            return this.store.setFilter(filter);
        }

        generatorFilterFunction () {
            const columns = this.store.getMetadata().columns;
            const projectColumns = _.assign({}, columns[constants.meta.RM_DEMAND_R], columns[constants.meta.RM_DEMAND_COST_R], columns[constants.meta.CO_PROJECT],
                columns[constants.meta.SA_PROJ_ALIGN_SCORE], columns[constants.meta.CO_CODE_TYPE_DATA]);
            return filterFactory(this.store.getFilter(), {
                allFields : projectColumns,
                getValue : (item, fieldName) => {
                    const column = _.get(projectColumns, fieldName);
                    let fieldValue;
                    if (column != null) {
                        if (column.logicalDataType === 'MULTICURRENCY_COST') {
                            return this.store.getProjectListMultiCurrencyHelper().getCost(item[fieldName]);
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
        }

        lookupRecordIcons (item) {
            const icons = {};
            this.projectValueIndicatorComparator = valueIndicatorComparator(this.store.items(constants.types.KPI),
                this.store.getColumnDefinition.bind(this.store), 'PROJECT', null,
                this.store.getProjectListMultiCurrencyHelper());
            this.projectSummaryValueIndicatorComparator = valueIndicatorComparator(
                this.store.items(constants.types.KPI), this.store.getColumnDefinition.bind(this.store),
                'PROJECT_SUMMARY', null, this.store.getProjectListMultiCurrencyHelper());

            const addIcon = (fieldName, indicator, bubbleColor) => {
                if (indicator != null) {
                    if (!_.has(icons, fieldName)) {
                        icons[fieldName] = {};
                    }
                    icons[fieldName] = indicatorIconFileMap(indicator, bubbleColor);
                }
            };

            const comparatorFn = (item.id === constants.types.PROJECT_SUMMARY) ?
                this.projectSummaryValueIndicatorComparator : this.projectValueIndicatorComparator;
            comparatorFn(item, addIcon);

            if (item.id === constants.types.PROJECT_SUMMARY) {
                this.projectSummaryValueIndicatorComparator(item, addIcon);
            } else {
                this.projectValueIndicatorComparator(item, addIcon);
            }
            return icons;
        }

        updateRecord (record, dataIndex, value) {
            if (!_.includes(this.getReadonlyFields(record), dataIndex)) {
                super.updateRecord(record, dataIndex, value);
            }
        }

        rollupValues (values) {
            return this.store.getProjectListMultiCurrencyHelper().getTotal(values);
        }

        // eslint-disable-next-line class-methods-use-this
        getTypeFromFilterType (filterType) {
            switch (filterType) {
                case constants.projectFilterTypes.BUDGET_APPROVED:
                    return constants.types.BUDGET_APPROVED_PROJECTS;
                case constants.projectFilterTypes.RESOURCE_APPROVED:
                    return constants.types.RESOURCE_APPROVED_PROJECTS;
                default:
                    return constants.types.PROJECTS;
            }
        }
    };
});
