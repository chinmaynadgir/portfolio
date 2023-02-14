define([
    'lodash',
    'localizer',
    'shared/userFormatters',
    'bpc/page/mainDetail/GridDetailPanelView',
    'src/portfolios/portfolioPerformanceScorecardV2/model/ProjectsGridMediator',
    'src/portfolios/portfolioPerformanceScorecardV2/view/grid/projectsGridGridConfig',
    'hbr!src/portfolios/portfolioPerformanceScorecardV2/view/templates/projectsGrid.hbs',
    'src/portfolios/portfolioPerformanceScorecardV2/portfolioPerformanceScorecardConstants',
    'shared/discussion/DiscussionListener'
], function (_, localizer, userFormatters, GridDetailPanelView, Mediator, gridConfig, markup, constants,
             DiscussionListener) {
    'use strict';

    return class ProjectsGridView extends GridDetailPanelView {
        // eslint-disable-next-line class-methods-use-this
        getPanelTemplate () {
            return markup;
        }

        _getGridConfig (metadata, type) {
            this.setUpDiscussion(this._controller.getStore().getDiscussionOptions());
            return gridConfig(metadata, type, this._controller.getStore().context, {
                mcHelper : this._controller.getStore().getProjectListMultiCurrencyHelper()
            }, this);
        }

        // eslint-disable-next-line class-methods-use-this
        _getMediator () {
            return Mediator;
        }

        _initListeners () {
            super._initListeners();
            this._$grid.on('grid-selected', (event, args) => {
                if (args.dataIndex === 'review') {
                    this._mediator.updateRecord(args.record, args.dataIndex, !args.record[args.dataIndex]);
                }
            });

            this._$grid.on('grid-unselected', (event, args) => {
                if (args.dataIndex === 'review') {
                    this._mediator.updateRecord(args.record, args.dataIndex, !args.record[args.dataIndex]);
                }
            });
            this._gridDiscussion.listen();
        }

        setUpDiscussion (discussionOptions) {
            this._gridDiscussion = new DiscussionListener(this._$grid, {
                dataIndex : constants.fields.NAME,
                scope : discussionOptions.scope,
                contextId : this._controller.getStore().context.id,
                contextScope : discussionOptions.contextScope,
                keys : {
                    idKey : constants.fields.ID
                },
                storeFns : {
                    filter : (record) => (!_.includes([constants.types.PROJECT_SUMMARY, constants.types.RESTRICTED_PROJECTS], record.id))
                }
            });
        }

        _applyViewConfig (viewConfig) {
            const fixedColumnGroup = _.findWhere(viewConfig.columnGroups, { id : constants.gridLayout.fixedColumnGroup });
            if (fixedColumnGroup) {
                const fixedColumns = fixedColumnGroup.columns;
                if (!_.includes(fixedColumns, constants.fields.REVIEW)) {
                    fixedColumns.push(constants.fields.REVIEW);
                }
            }
            super._applyViewConfig(viewConfig);
        }

        _getViewConfig () {
            const viewData = super._getViewConfig();
            const mcHelper = this._controller.getStore().getProjectListMultiCurrencyHelper();
            mcHelper.addMetaViewPreferences(viewData);
            return viewData;
        }

        _getGridSettingsConfig () {
            const store = this._controller.getStore();
            const metadata = this._controller.getMetadata();
            const mcHelper = store.getProjectListMultiCurrencyHelper();
            const columns = metadata[constants.meta.COLUMNS];
            const measureColumnKeys = store.measuresProjectsColumns;
            const projectColumns = _.omit(columns[constants.meta.CO_PROJECT], ['allocated', 'unallocated'],
                measureColumnKeys);
            const demandColumns = columns[constants.meta.RM_DEMAND_R];
            const costColumns = columns[constants.meta.RM_DEMAND_COST_R];
            const projectStrategyScore = columns[constants.meta.SA_PROJ_ALIGN_SCORE];
            const fundColumns = _.omit(columns[constants.meta.FN_FUND_TOTAL_COST], ['allocated', 'unallocated']);
            const projectCategoryColumns = columns[constants.meta.CO_CODE_TYPE_DATA];
            const projectMeasures = columns[constants.meta.PROJECT_MEASURE];
            const allColumns = _.assign({}, projectColumns, projectStrategyScore, projectCategoryColumns, demandColumns,
                costColumns, fundColumns, projectMeasures);
            const groupingColumns = _.assign({},
                _.pick(projectColumns, 'addedBy', 'owner', 'riskLevel', 'stateName', 'status'), projectCategoryColumns);
            return {
                columns : {
                    allColumns : _.omit(allColumns, ['id', 'name', 'currency', 'CURRENCY_ID']),
                    groupId : constants.gridLayout.flexColumnGroup
                },
                grouping : {
                    allColumns : groupingColumns,
                    hierarchyGroupings : store.getCodeFields()
                },
                filter : {
                    allColumns : _.omit(allColumns, measureColumnKeys),
                    filter : store.filter
                },
                extraTabs : {
                    currency : mcHelper.getMulticurrencySettingsController()
                }
            };
        }
    };
});
