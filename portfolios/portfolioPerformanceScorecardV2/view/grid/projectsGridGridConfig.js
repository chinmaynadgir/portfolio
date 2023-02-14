define([
    'lodash',
    'userFormatters',
    'localizer',
    'shared/columnFactory/columnUtil',
    'shared/constants/logicalDataTypes',
    'gridapi.columns/numberColumn',
    'gridapi.columns/checkColumn',
    'gridapi.grid/columns/core/renderer',
    'gridapi.columns/hyperLinkColumn',
    'src/portfolios/portfolioPerformanceScorecardV2/portfolioPerformanceScorecardConstants'
], function (_, userFormatters, localizer, columnUtil, logicalDataTypes, numberColumn, checkColumn, renderer,
             hyperLinkColumn, constants) {
    'use strict';

    const FIXED_COLUMNS = constants.columns[constants.types.PROJECTS][constants.meta.FIXED];

    const DEMAND_TABLE_DATES = [
        constants.fields.COMMITTED_START,
        constants.fields.COMMITTED_END,
        constants.fields.DEMAND_START,
        constants.fields.DEMAND_END,
        constants.fields.PLAN_START,
        constants.fields.PLAN_FINISH,
        constants.fields.PROPOSED_START_DATE,
        constants.fields.PROPOSED_END_DATE
    ];
    const sortEnums = (column) => (
        _.pluck(_.sortBy(column.columnDefinition.selectValues, 'sequenceNumber'), 'id'));

    const formatDate = (record, val) => (
        record.formattedValue ? record.formattedValue : userFormatters.globalDateFormatter.format(val));

    return (metadata, type, context, components, view) => {
        const meta = metadata;
        const metadataColumns = _.assign({},
            meta.columns[constants.meta.CO_PROJECT], meta.columns[constants.meta.CO_CODE_TYPE_DATA],
            meta.columns[constants.meta.PROJECT_MEASURE], meta.columns[constants.meta.RM_DEMAND_R],
            meta.columns[constants.meta.RM_DEMAND_COST_R], meta.columns[constants.meta.SA_PROJ_ALIGN_SCORE],
            _.omit(meta.columns[constants.meta.FN_FUND_TOTAL_COST], ['allocated', 'unallocated']),
            _.pick(meta.columns[constants.meta.PortfolioProjectRO], constants.fields.REVIEW));
        const codesRegExp = new RegExp(constants.codeType.CO_CODE_TYPE);
        const flexRegExp = new RegExp(constants.regExpPatterns.FLEX_PATTERN);
        const udfRegExp = new RegExp(constants.regExpPatterns.FLEX_PATTERN_PORTFOLIO);
        const defaultCols = ['code', 'planStart', 'planFinish'];
        let flexColumns = _.clone(constants.columns[constants.types.PROJECTS][constants.meta.FLEX]);
        flexColumns = _.union(flexColumns, _.intersection(_.keys(metadataColumns), defaultCols));
        const projectMeasureColumns = _.keys(meta.columns[constants.meta.PROJECT_MEASURE]);

        const multiCurrencyColumnRenderer = numberColumn.renderer.extend({
            format : (renderOptions) => (
                _.isObject(renderOptions.data) ? components.mcHelper.getFormatter().format(renderOptions.data) :
                    renderOptions.column.formatter.format(renderOptions.data)
            )
        });
        const getContextMenu = () => ({
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
                checkActionEnabled :  (action) => {
                    const column = this.grid.selection.recordIds[0];
                    return (action.actionIndex === 'snapshotData') ?
                        ((column !== constants.types.PROJECT_SUMMARY) &&
                            (column !== constants.types.RESTRICTED_PROJECTS)) : action.enabled;
                }
            }
        });

        const getDisplayValue = (value) => (_.isEmpty(value) ? '' : value.displayName);

        const baseColumns = {
            code : {
                hideAsterisk : true
            },
            name : {
                hideAsterisk : true,
                draggable : false,
                expandable : true,
                search : true,
                dataDisplay : 'icon-value',
                width : '300px',
                isEntityLink : true,
                entityInfo : {
                    type : 'PROJECT',
                    id : (data, record) => ((record.id === constants.types.PROJECT_SUMMARY ||
                        record.id === constants.types.RESTRICTED_PROJECTS) ? null : record.id)
                }
            },
            review : {
                width : '50px',
                headerAlign : 'center',
                columnClass : 'icon-column',
                tooltip : '',
                readOnly : false,
                draggable : false,
                renderer : checkColumn.renderer.extend({
                    getValueMarkup : (renderOptions) => {
                        if (!_.includes([constants.types.PROJECT_SUMMARY, constants.types.RESTRICTED_PROJECTS], renderOptions.recordId)) {
                            const isChecked = checkColumn.renderer.prototype.isValueChecked(renderOptions);
                            const input1 = '<i class="flagged-icon pgbu-icon pgbu-icon-review-selected" data-trigger="selected" style="color:red" ' +
                                (renderOptions.readOnly ? 'disabled' : '') + '></i>';
                            const input2 = '<i class="flagged-icon pgbu-icon pgbu-icon-review-unselected" data-trigger="unselected" ' +
                                (renderOptions.readOnly ? 'disabled' : '') + '></i>';
                            return isChecked ? input1 : input2;
                        }
                    },
                    getAttributes : (renderOptions) => {
                        const tooltip = checkColumn.renderer.prototype.isValueChecked(renderOptions) ? localizer.getString(
                            'label.status_update_toolbar_unflag') : localizer.getString('label.status_update_toolbar_flag');
                        return ' title="' + tooltip + '" ';
                    }
                }),
                rendererFns : {
                    getExcelCellData : (renderOptions) => (
                        _.isUndefined(renderOptions.data) ? '' : localizer.getString(renderOptions.data ? 'label.ms_flagged' : 'label.ms_not_flagged'))
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
                    sortValues : () => sortEnums(this)
                }
            }
        };
        const defaultColumnOpts = {
            draggable : true,
            expandable : false,
            resizable : true,
            sortable : true,
            readOnly : true,
            rendererFns : {
                getExcelCellData : (renderOptions) => (renderOptions.locked ? '' : renderOptions.formattedValue)
            }
        };
        const fundColumnOptns = {
            hideAsterisk : true,
            renderer : multiCurrencyColumnRenderer
        };

        const columns = columnUtil.makeColumns({
            multicurrencyHelper : components.mcHelper,
            customizedGridColumns : columnUtil.remapKeys(metadataColumns, (columnDef, dataIndex) => {
                const column = baseColumns[dataIndex] ? _.assign({}, defaultColumnOpts, baseColumns[dataIndex]) :
                    _.clone(defaultColumnOpts);
                if (_.includes(defaultCols, dataIndex) || _.includes(FIXED_COLUMNS, dataIndex)) {
                    column.visible = true;
                }
                if (constants.customformatters[dataIndex] !== undefined) {
                    column.renderer = renderer.extend({
                        format : (renderOptions) => {
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
                        format : (renderOptions) => {
                            if (renderOptions.record.type !== constants.types.PROJECT_SUMMARY) {
                                if (renderOptions.data === constants.keys.NOT_APPLICABLE) {
                                    return localizer.getString('label.cp_not_applicable');
                                }
                                return renderOptions.column.formatter.format(renderOptions.data);
                            }
                        },
                        getValueMarkup : (renderOptions) => {
                            if (renderOptions.record.type !== constants.types.PROJECT_SUMMARY) {
                                if (renderOptions.data === null) {
                                    renderOptions.formattedValue = constants.customformatters.EMPTY_MEASURE_FORMAT;
                                }
                                if (renderOptions.data === constants.keys.NOT_APPLICABLE) {
                                    return localizer.getString('label.cp_not_applicable');
                                }
                                return hyperLinkColumn.renderer.prototype.getValueMarkup(renderOptions);
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
                    columnDef.logicalDataType !== logicalDataTypes.COST_TYPES)) && !columnDef.calcUdf) {
                    column.readOnly = false;
                }
                return column;
            }),
            ignoreValidationOn : _.union(constants.fields.FUNDS_FIELDS,
                ['id', constants.fields.NAME, 'isTemplateFlag', 'code', 'parentId', constants.fields.PRIMARY_PROGRAM]),
            groupTitleField : constants.fields.NAME,
            defaultNumberColumnType : 'number',
            getColumnDefinitionFn : (dataIndex) => metadataColumns[dataIndex]
        });
        _.forEach(columns, (column, columnName) => {
            if (codesRegExp.test(columnName)) {
                column.rendererFns = {
                    format : (renderOptions) => (
                        renderOptions.data && renderOptions.data.displayName ? renderOptions.data.displayName : null)
                };
                column.getSortValue = getDisplayValue;
                column.readOnly = false;
            }
        });
        _.forEach(constants.columns.earnedValueFields, (columnName) => {
            columns[columnName].readOnly = false;
        });
        _.forEach(constants.columns.projectGeneralEditableFields, (columnName) => {
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
            mcHelper : components.mcHelper,
            joinedColumns : [view._gridDiscussion.getIconColumn()]
        };
    };
});
