define([
    'lodash',
    'localizer',
    'userFormatters',
    'shared/columnFactory/columnUtil',
    'src/portfolios/portfolioPerformanceScorecardV2/portfolioPerformanceScorecardConstants',
    'gridapi.grid/columns/core/renderer',
    'shared/sharedData/owningWorkspaceColumnOptions',
    'shared/linkFactory',
    'shared/constants/logicalDataTypes',
    'packages/capitalPlanning/periods/periodTitleFormatter',
    'gridapi.columns/hyperLinkColumn',
    'gridapi.columns/numberColumn'
], function (_, localizer, userFormatters, columnUtil, constants, renderer, owningWorkspaceColumnOptions,
    linkFactory, logicalDataTypes, PeriodFormatter, hyperLinkColumn, numberColumn) {
    'use strict';

    return (metadata, type, components, view) => {
        const periodFormatter = new PeriodFormatter({ fiscalYearSetup : metadata.fiscalYearSetup });
        const allColumns = _.omit(_.assign({}, metadata.columns[constants.meta.PORTFOLIOS],
            metadata.columns[constants.meta.PORTFOLIO_SCORECARD_DETAILS],
            metadata.columns[constants.meta.FN_FUND_TOTAL_COST]), 'addedBy', 'lastModifiedBy');
        const flexRegExp = new RegExp(constants.regExpPatterns.FLEX_PATTERN);
        const udfRegExp = new RegExp(constants.regExpPatterns.FLEX_PATTERN_PORTFOLIO);
        const codesRegExp = new RegExp(constants.regExpPatterns.codeKey);

        const multiCurrencyColumnRenderer = numberColumn.renderer.extend({
            format : (renderOptions) => {
                if (_.isObject(renderOptions.data)) {
                    return components.mcHelper.getFormatter().format(renderOptions.data);
                }
                return renderOptions.column.formatter.format(renderOptions.data);
            }
        });

        const defaultCols = constants.columns.portfolioListDefaults;
        const defaultColumnOpts = {
            draggable : true,
            expandable : true,
            resizable : true,
            readOnly : true,
            sortable : true
        };
        const fundColumnOptns = {
            hideAsterisk : true,
            renderer : multiCurrencyColumnRenderer
        };

        const baseColumns = {
            code : {
                unique : true,
                autoNumbered : true,
                required : true,
                hideAsterisk : true,
                requiredManualValidation : true
            },
            name : {
                dataIndex : 'name',
                width : '350px',
                visible : true,
                isEntityLink : true,
                hideAsterisk : true,
                entityInfo : {
                    id : (data, record) => {
                        if (record.itemType === constants.types.PORTFOLIO_SUMMARY) {
                            return null;
                        }
                        return record.id;
                    },
                    type : 'GENERIC_PORTFOLIO'
                }
            },

            description : {
                dataIndex : 'description'
            },
            ownerName : {
                dataIndex : 'ownerName',
                displayType : 'picker',
                rendererFns : {
                    format : (rendererOptions) => (rendererOptions.data ? rendererOptions.data.displayName : '')
                }
            },
            primaryProgram : {
                dataIndex : constants.fields.PRIMARY_PROGRAM,
                displayType : 'picker',
                rendererFns : {
                    format : (rendererOptions) => (rendererOptions.data ? rendererOptions.data.displayName : '')
                }
            },
            dateAdded : {
                dataIndex : 'dateAdded'
            },
            dateLastModified : {
                dataIndex : 'dateLastModified'
            },
            planPeriod : {
                rendererFns : {
                    format : (rendererOptions) => (rendererOptions.data ? periodFormatter.formatYear(
                        rendererOptions.data) : '')
                }
            },
            resourcePlanPeriod : {
                rendererFns : {
                    format : (rendererOptions) => (rendererOptions.data ? periodFormatter.formatYear(
                        rendererOptions.data) : '')
                }
            },
            workspaceName : owningWorkspaceColumnOptions({
                workspaceName : 'workspaceName',
                workspaceId : 'workspaceId'
            })

        };

        const measureColumns = view._controller.getStore().measuresPortfolioColumns;

        const columns = columnUtil.makeColumns({
            multicurrencyHelper : components.mcHelper,
            customizedGridColumns : columnUtil.remapKeys(allColumns, (columnDef, dataIndex) => {
                const column = baseColumns[dataIndex] ? _.assign({}, defaultColumnOpts,
                    baseColumns[dataIndex]) : _.clone(defaultColumnOpts);

                if (dataIndex === constants.fields.NAME) {
                    column.renderer = renderer.extend({
                        getValueMarkup : (renderOptions) => {
                            if (renderOptions.recordId === constants.types.RESTRICTED_PORTFOLIO_COUNT) {
                                renderOptions.isLinkWrappedCall = true; // making it true the cell won't be rendered as hyperlink.
                            }
                            return renderOptions.data;
                        }
                    });
                }
                if (columnDef.logicalDataType === logicalDataTypes.FLEX_MULTICURRENCY_COST) {
                    _.merge(column, fundColumnOptns);
                }
                if (_.includes(measureColumns, dataIndex)) {
                    column.visible = true;
                    column.dataDisplay = 'value';

                    column.renderer = hyperLinkColumn.renderer.extend({
                        format : (renderOptions) => {
                            if (renderOptions.data === constants.keys.NOT_APPLICABLE && renderOptions.record.id !== constants.types.PORTFOLIO_SUMMARY) {
                                return localizer.getString('label.cp_not_applicable');
                            }
                            return renderOptions.column.formatter.format(renderOptions.data);
                        },
                        getValueMarkup : (renderOptions) => {
                            if (renderOptions.data === null && renderOptions.record.itemType !== constants.types.PORTFOLIO_SUMMARY) {
                                renderOptions.formattedValue = constants.customformatters.EMPTY_MEASURE_FORMAT;
                            }
                            if (renderOptions.data === constants.keys.NOT_APPLICABLE) {
                                return localizer.getString('label.cp_not_applicable');
                            }
                            return hyperLinkColumn.renderer.prototype.getValueMarkup(renderOptions);
                        }
                    });
                } else if (_.includes(defaultCols, dataIndex)) {
                    column.visible = true;
                }

                if (_.includes(constants.fields.FUNDS_FIELDS, dataIndex)) {
                    _.merge(column, fundColumnOptns);
                }
                if ((flexRegExp.test(columnDef.columnName) || (udfRegExp.test(columnDef.columnName) &&
                    columnDef.logicalDataType !== logicalDataTypes.COST_TYPES)) && columnDef.calcUdf !== true) {
                    column.readOnly = false;
                }

                return column;
            }),
            groupTitleField : 'name',
            getColumnDefinitionFn : (dataIndex) => allColumns[dataIndex],
            ignoreValidationOn : ['name', 'workspaceName', 'planPeriod', 'resourcePlanPeriod']
        });
        _.forEach(columns, (column, columnName) => {
            if (codesRegExp.test(columnName)) {
                column.rendererFns = {
                    format : (renderOptions) => {
                        const index = constants.codeType.CO_CODE_TYPE +
                            parseInt(renderOptions.column.dataIndex.replace('codeValues.', ''), 10);
                        if ((renderOptions.record[index]) !== undefined &&
                            renderOptions.record.itemType !== constants.types.PORTFOLIO_SUMMARY) {
                            return renderOptions.record[index].displayName;
                        }
                        return renderOptions.data && renderOptions.data.displayName ? renderOptions.data.displayName : null;
                    }
                };
                column.readOnly = false;
            }
        });

        return {
            editable : true,
            layout : {
                height : '100%',
                width : '100%',
                rowsets : [
                    {
                        id : constants.gridLayout.portfolioListFixedRowset,
                        excludeRecordCount : true,
                        type : 'fixed',
                        sortable : false
                    },
                    {
                        id : constants.gridLayout.flexRowset,
                        type : 'flex'
                    }
                ],
                columnGroups : [
                    {
                        id : constants.gridLayout.fixedColumnGroup,
                        type : 'fixed',
                        columns : ['name']
                    },
                    {
                        id : constants.gridLayout.flexColumnGroup,
                        type : 'flex',
                        columns : defaultCols
                    }
                ]
            },
            columns : columns,
            recordKeys : {
                id : 'id'
            },
            export : {
                enabled : true
            },
            mcHelper : components.mcHelper
        };
    };
});
