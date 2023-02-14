define([
    'lodash',
    'localizer',
    'formattingUtils',
    'shared/columnFactory/columnUtil',
    'shared/constants/logicalDataTypes',
    'gridapi.columns/checkColumn',
    'src/portfolios/portfolioPerformanceScorecard/portfolioPerformanceScorecardConstants',
    'gridapi.grid/columns/core/renderer',
    'gridapi.columns/numberColumn',
    'gridapi.columns/hyperLinkColumn',
    'userFormatters'
], function (_, localizer, formattingUtils, columnUtil, logicalDataTypes, checkColumn, constants,
             renderer, numberColumn, hyperLinkColumn, userFormatters) {
    'use strict';

    var FIXED_COLUMNS = constants.columns[constants.types.PROJECTS][constants.meta.FIXED];

    var DEMAND_TABLE_DATES = [
        constants.fields.COMMITTED_START,
        constants.fields.COMMITTED_END,
        constants.fields.DEMAND_START,
        constants.fields.DEMAND_END,
        constants.fields.PLAN_START,
        constants.fields.PLAN_FINISH,
        constants.fields.PROPOSED_START_DATE,
        constants.fields.PROPOSED_END_DATE
    ];
    var sortEnums = function (column) {
        var selectValues = _.sortBy(column.columnDefinition.selectValues, 'sequenceNumber');
        return _.pluck(selectValues, 'id');
    };
    function formatDate (record, val) {
        return record.formattedValue ? record.formattedValue : userFormatters.globalDateFormatter.format(val);
    }

    return function (metadata, type, context, components, view) {
        var meta = metadata,
            metadataColumns = _.assign({},
                meta.columns[constants.meta.CO_PROJECT], meta.columns[constants.meta.CO_CODE_TYPE_DATA], meta.columns[constants.meta.PROJECT_MEASURE],
                meta.columns[constants.meta.RM_DEMAND_R], meta.columns[constants.meta.RM_DEMAND_COST_R], meta.columns[constants.meta.SA_PROJ_ALIGN_SCORE],
                _.omit(meta.columns[constants.meta.FN_FUND_TOTAL_COST], ['allocated', 'unallocated']),
                _.pick(meta.columns[constants.meta.PortfolioProjectRO], constants.fields.REVIEW)),
            codesRegExp = new RegExp(constants.codeType.CO_CODE_TYPE),
            flexRegExp = new RegExp(constants.regExpPatterns.FLEX_PATTERN),
            udfRegExp = new RegExp(constants.regExpPatterns.FLEX_PATTERN_PORTFOLIO),
            defaultCols = ['code', 'planStart', 'planFinish'];
        var flexColumns = _.clone(constants.columns[constants.types.PROJECTS][constants.meta.FLEX]);
        flexColumns = _.union(flexColumns, _.intersection(_.keys(metadataColumns), defaultCols));
        var projectMeasureColumns = _.keys(meta.columns[constants.meta.PROJECT_MEASURE]);

        var multiCurrencyColumnRenderer = numberColumn.renderer.extend({
            format : function (renderOptions) {
                if (_.isObject(renderOptions.data)) {
                    return components.mcHelper.getFormatter().format(renderOptions.data);
                }
                return renderOptions.column.formatter.format(renderOptions.data);
            }
        });
        function getContextMenu () {
            return {
                enabled : context.hasCurrentApprovedBudgetPlan,
                enableIcons : false,
                enableRowMenuButton : true,
                enableHoverRowMenuButton : true,
                hideDisabled : true,
                actionOrder : [
                    'snapshotData'
                ],
                actions : {
                    snapshotData : {
                        label : localizer.getString('label.ms_view_snapshots'),
                        trigger : 'view-snapshot-data'
                    }
                },
                menuFns : {
                    checkActionEnabled : function (action) {
                        var enabled = action.enabled;
                        var column = this.grid.selection.recordIds[0];
                        if (action.actionIndex === 'snapshotData') {
                            return ((column !== constants.types.PROJECT_SUMMARY) && (column !== constants.types.RESTRICTED_PROJECTS));
                        }
                        return enabled;
                    }
                }
            };
        }

        function getDisplaValue (value) {
            return _.isEmpty(value) ? '' : value.displayName;
        }

        var baseColumns = {
            code : {
                hideAsterisk : true
            },
            name : {
                hideAsterisk : true,
                draggable : false,
                expandable : true,
                dataDisplay : 'icon-value',
                width : '300px',
                isEntityLink : true,
                entityInfo : {
                    type : 'PROJECT',
                    id : function (data, record) {
                        if (record.id === constants.types.PROJECT_SUMMARY || record.id === constants.types.RESTRICTED_PROJECTS) {
                            return null;
                        }
                        return record.id;
                    }
                }
            },
            review : {
                width : '50px',
                headerAlign : 'center',
                columnClass : 'icon-column',
                tooltip : '',
                readOnly : false,
                draggable : false,
                sorter : function (value1, value2, asc) {
                    var a, b;
                    if (asc) {
                        a = value1;
                        b = value2;
                    } else {
                        a = value2;
                        b = value1;
                    }
                    if (a == null) return -1;
                    if (b == null) return 1;
                    return a < b ? -1 : a > b ? 1 : 0;
                },
                renderer : checkColumn.renderer.extend({
                    getValueMarkup : function (renderOptions) {
                        if (!_.includes([constants.types.PROJECT_SUMMARY, constants.types.RESTRICTED_PROJECTS], renderOptions.recordId)) {
                            var isChecked = this.isValueChecked(renderOptions);
                            var input1 = '<i class="flagged-icon pgbu-icon pgbu-icon-review-selected" data-trigger="selected" style="color:red" ' +
                                (renderOptions.readOnly ? 'disabled' : '') + '></i>';
                            var input2 = '<i class="flagged-icon pgbu-icon pgbu-icon-review-unselected" data-trigger="unselected" ' +
                                (renderOptions.readOnly ? 'disabled' : '') + '></i>';
                            return isChecked ? input1 : input2;
                        }
                    },
                    getAttributes : function (renderOptions) {
                        var isChecked = this.isValueChecked(renderOptions);
                        var tooltip = localizer.getString('label.status_update_toolbar_flag');
                        if (isChecked) {
                            tooltip = localizer.getString('label.status_update_toolbar_unflag');
                        }
                        return ' title="' + tooltip + '" ';
                    }
                }),
                rendererFns : {
                    getExcelCellData : function (renderOptions) {
                        if (_.isUndefined(renderOptions.data)) {
                            return '';
                        }
                        return renderOptions.data === true ? localizer.getString('label.ms_flagged') : localizer.getString('label.ms_not_flagged');
                    }
                }
            },
            allocated : {
                rollupRole : 'store'
            },
            appropriated : {
                rollupRole : 'store'
            },
            consumed : {
                rollupRole : 'store'
            },
            remaining : {
                rollupRole : 'store'
            },
            total : {
                rollupRole : 'store'
            },
            unallocated : {
                rollupRole : 'store'
            },
            unappropriated : {
                rollupRole : 'store'
            },
            riskLevel : {
                groupingFns : {
                    sortValues : function () {
                        return sortEnums(this);
                    }
                }
            }
        };
        var defaultColumnOpts = {
                draggable : true,
                expandable : false,
                resizable : true,
                sortable : true,
                readOnly : true,
                rendererFns : {
                    getExcelCellData : function (renderOptions) {
                        return renderOptions.locked ? '' : renderOptions.formattedValue;
                    }
                }
            }, fundColumnOptns = {
                hideAsterisk : true,
                renderer : multiCurrencyColumnRenderer
            };

        var columns = columnUtil.makeColumns({
            multicurrencyHelper : components.mcHelper,
            customizedGridColumns : columnUtil.remapKeys(metadataColumns, function (columnDef, dataIndex) {
                var column = baseColumns[dataIndex] ? _.assign({}, defaultColumnOpts, baseColumns[dataIndex]) : _.clone(defaultColumnOpts);
                if (_.includes(defaultCols, dataIndex) || _.includes(FIXED_COLUMNS, dataIndex)) {
                    column.visible = true;
                }
                if (constants.customformatters[dataIndex] !== undefined) {
                    column.renderer = renderer.extend({
                        format : function (renderOptions) {
                            if (renderOptions.data !== null && !_.isUndefined(renderOptions.data)) {
                                return renderOptions.data[constants.customformatters[dataIndex]];
                            }
                        }
                    });
                }
                if (_.includes(DEMAND_TABLE_DATES, dataIndex)) {
                    _.assign(column, { rendererFns : { format : formatDate } });
                }
                if (_.includes(projectMeasureColumns, dataIndex)) {
                    column.readOnly = false;
                    column.dataDisplay = 'value-icon';
                    column.renderer = hyperLinkColumn.renderer.extend({
                        format : function (renderOptions) {
                            if (renderOptions.record.type !== constants.types.PROJECT_SUMMARY) {
                                if (renderOptions.data === constants.keys.NOT_APPLICABLE) {
                                    return localizer.getString('label.cp_not_applicable');
                                }
                                return renderOptions.column.formatter.format(renderOptions.data);
                            }
                        },
                        getValueMarkup : function (renderOptions) {
                            if (renderOptions.record.type !== constants.types.PROJECT_SUMMARY) {
                                if (renderOptions.data === null) {
                                    renderOptions.formattedValue = constants.customformatters.EMPTY_MEASURE_FORMAT;
                                }
                                if (renderOptions.data === constants.keys.NOT_APPLICABLE) {
                                    return localizer.getString('label.cp_not_applicable');
                                }
                                return this.constructor.__super__.getValueMarkup.call(this, renderOptions);
                            }
                        }
                    });
                }

                if (_.includes(constants.fields.FUNDS_FIELDS, dataIndex)) {
                    _.merge(column, fundColumnOptns);
                }
                if (codesRegExp.test(dataIndex)) {
                    columnDef.codePickerType = constants.columnDefProperties.GENERIC_PICKER;
                    columnDef.joinedOn = constants.columnDefProperties.CODE_VALUE;
                    columnDef.codeTypeId = columnDef.columnId;
                    columnDef.logicalDataType = constants.codeType.CODE;
                }
                if (dataIndex === constants.fields.PRIMARY_PROGRAM) {
                    columnDef.joinedOn = 'PROGRAM';
                    columnDef.logicalDataType = 'JOIN';
                }
                if (dataIndex === constants.fields.OWNER) {
                    columnDef.logicalDataType = constants.columnDefProperties.JOIN;
                    columnDef.joinedOn = constants.columnDefProperties.APPLICATION_USER;
                }
                if ((flexRegExp.test(columnDef.columnName) || (udfRegExp.test(columnDef.columnName) &&
                        columnDef.logicalDataType !== logicalDataTypes.COST_TYPES)) && columnDef.calcUdf !== true) {
                    column.readOnly = false;
                }
                return column;
            }),
            ignoreValidationOn : _.union(constants.fields.FUNDS_FIELDS,
                ['id', constants.fields.NAME, 'isTemplateFlag', 'code', 'parentId', constants.fields.PRIMARY_PROGRAM]),
            groupTitleField : constants.fields.NAME,
            defaultNumberColumnType : 'number',
            getColumnDefinitionFn : function (dataIndex) {
                return metadataColumns[dataIndex];
            }
        });
        _.forEach(columns, function (column, columnName) {
            if (codesRegExp.test(columnName)) {
                column.rendererFns = {
                    format : function (renderOptions) {
                        return renderOptions.data && renderOptions.data.displayName ? renderOptions.data.displayName : null;
                    },
                    getAttributes : function (rendererOptions) {
                        if (view.showBackgroundColor) {
                            if (rendererOptions.data && rendererOptions.data.color) {
                                return ' style="background-color:' + rendererOptions.data.color + '"';
                            }
                        }
                    }
                };
                column.getSortValue = getDisplaValue;
                column.readOnly = false;
            }
        });
        _.forEach(constants.columns.earnedValueFields, function (columnName) {
            columns[columnName].readOnly = false;
        });
        _.forEach(constants.columns.projectGeneralEditableFields, function (columnName) {
            columns[columnName].readOnly = false;
        });
        columns[constants.fields.OWNER].displayType = constants.columnDefProperties.PICKER;
        return {
            editable : true,
            filldown : true,
            layout : {
                height : '100%',
                width : '100%',
                rowsets : [
                    {
                        id : constants.gridLayout.fixedRowset,
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
                        columns : FIXED_COLUMNS
                    },
                    {
                        id : constants.gridLayout.flexColumnGroup,
                        type : 'flex',
                        columns : flexColumns
                    }
                ]
            },
            columns : columns,
            recordKeys : {
                id : 'id'
            },
            contextMenu : getContextMenu(context),
            export : {
                enabled : true
            },
            joinedColumns : [view._gridDiscussion.getIconColumn()],
            statusBar : {
                toggleItems : [
                    {
                        label : localizer.getString('label.prioritization_matrix_show_color_label'),
                        onChange : view.toggleBackgroundColor.bind(view),
                        enabled : function () {
                            return view.showBackgroundColor;
                        },
                        action : localizer.getString('label.prioritization_matrix_show_color_label')
                    }
                ]
            },
            mcHelper : components.mcHelper
        };
    };
});
