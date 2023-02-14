define([
    'jquery', 'lodash', 'localizer',
    'bpc/page/mainDetail/GridPanelView',
    'src/portfolios/portfolioPerformanceScorecard/model/PortfolioPerformanceScorecardMediator',
    'src/portfolios/portfolioPerformanceScorecard/view/grid/portfolioPerformanceScorecardGridConfig',
    'src/portfolios/portfolioPerformanceScorecard/portfolioPerformanceScorecardConstants',
    'shared/userFormatters',
    'hbr!src/portfolios/portfolioPerformanceScorecard/view/templates/emptyStateTemplate.hbs',
    'shared/gridSettingsDialog/GridSettingsDialog',
    'src/portfolios/portfolioPerformanceScorecard/view/SnapshotDialogView',
    'src/portfolios/portfolioPerformanceScorecard/controller/SnapshotDialogController',
    'src/portfolios/scenarios/views/dialogs/measureTimePhaseDialog',
    'shared/discussion/DiscussionListener',
    'primutils/ui/dialogs/SavingDialog',
    'src/costs/projectCostSheet/projectCostSheetMcHelper'
], function ($, _, localizer, GridPanelView, Mediator, gridConfig, constants, userFormatters, emptyState, GridSettingsDialog,
             SnapshotView, SnapshotController, measureTimePhaseDialog, DiscussionListener, SavingSpinner, ProjectCostSheetMcHelper) {
    'use strict';

    var dateTimeFormatter = userFormatters.globalDateTimeFormatter;

    function ProjectListView (parentView, controller, model, options, panelId) {
        GridPanelView.apply(this, arguments);
        this._parentView = parentView;
        this._panelId = panelId;
    }

    ProjectListView.prototype = _.assign(Object.create(GridPanelView.prototype), {
        constructor : ProjectListView,

        buildElement : function () {
            return this._parentView.element().find('#project-table');
        },

        _getGridConfig : function (metadata, type) {
            var that = this;
            this.setUpDiscussion(this._controller.getStore().getDiscussionOptions());
            return gridConfig(metadata, type, this._controller.getStore().context, {
                mcHelper : that._controller.getStore().getProjectListMultiCurrencyHelper()
            }, this);
        },

        _getMediator : function () {
            return Mediator;
        },

        _initComponents : function () {
            var context = this._controller.getStore().context,
                privileges = context.privileges;
            this.$projectSettingsBtn = this._parentView._$el.find('#project-settings-btn');
            this.$projectFilterRefreshButton = this._parentView._$el.find('#project-filter-refresh');
            this.$projectFilterRefreshIcon = this._parentView._$el.find('#project-filter-refresh-icon');
            this.$projectFilterRefreshButton.toggleClass('hidden', !privileges.canEdit);
            GridPanelView.prototype._initComponents.apply(this, arguments);
            this.updateColorToggles();
            this.updateRefreshDate();
        },

        _initListeners : function () {
            var that = this;
            GridPanelView.prototype._initListeners.apply(this, arguments);
            this.$projectSettingsBtn.on('click', function (e) {
                var metadata = that._controller.getMetadata(),
                    mcHelper = that._controller.getStore().getProjectListMultiCurrencyHelper(),
                    columns = metadata[constants.meta.COLUMNS],
                    measureColumns = _.pick(columns[constants.meta.CO_PROJECT], function (definition, item) {
                        if (definition.measureColumn !== undefined) {
                            return item;
                        }
                    }),
                    measureColumnKeys = _.keys(measureColumns),
                    projectColumns = _.omit(columns[constants.meta.CO_PROJECT], ['allocated', 'unallocated'], measureColumnKeys),
                    demandColumns = columns[constants.meta.RM_DEMAND_R],
                    costColumns = columns[constants.meta.RM_DEMAND_COST_R],
                    projectStrategyScore = columns[constants.meta.SA_PROJ_ALIGN_SCORE],
                    fundColumns = _.omit(columns[constants.meta.FN_FUND_TOTAL_COST], ['allocated', 'unallocated']),
                    projectCategoryColumns = columns[constants.meta.CO_CODE_TYPE_DATA],
                    projectMeasures = columns[constants.meta.PROJECT_MEASURE],
                    allColumns = _.assign({}, projectColumns, projectStrategyScore, projectCategoryColumns, demandColumns,
                        costColumns, fundColumns, projectMeasures),
                    groupingColumns = _.assign({}, _.pick(projectColumns, 'addedBy', 'owner', 'riskLevel', 'stateName', 'status'), projectCategoryColumns);
                new GridSettingsDialog({
                    grid : that._$grid,
                    columns : {
                        allColumns : _.omit(allColumns, ['id', 'name', 'currency', 'CURRENCY_ID']),
                        groupId : constants.gridLayout.flexColumnGroup
                    },
                    grouping : {
                        allColumns : groupingColumns,
                        hierarchyGroupings : that._mediator.store.getCodeFields()
                    },
                    filter : {
                        allColumns : _.omit(allColumns, _.keys(measureColumns)),
                        filter : that._controller.getStore().filter
                    },
                    extraTabs : {
                        currency : mcHelper.getMulticurrencySettingsController()
                    }
                });
            });

            this.$projectFilterRefreshButton.on('click', function (event) {
                var portfolioId = _.first(that._controller.getGridItems(constants.types.PORTFOLIOID));
                that.refreshProjects(portfolioId);
            });

            this._$grid.on('grid-selected', function (event, args) {
                if (args.dataIndex === 'review') {
                    that._mediator.updateRecord(args.record, args.dataIndex, !args.record[args.dataIndex]);
                }
            });

            this._$grid.on('grid-unselected', function (event, args) {
                if (args.dataIndex === 'review') {
                    that._mediator.updateRecord(args.record, args.dataIndex, !args.record[args.dataIndex]);
                }
            });
            this._gridDiscussion.listen();
        },
        _initGridListeners : function () {
            var that = this;
            GridPanelView.prototype._initGridListeners.apply(this, arguments);
            this._$grid.on('grid-view-snapshot-data', function (event, args) {
                var project = args.records[0], scorecardController = that._controller, visibleColumns = [];
                var viewConfig = _.pick(that._getViewConfig().named, 'columnGroups');
                _.forEach(that._getViewConfig().named.columns, function (column, dataIndex) {
                    if (column.visible) {
                        visibleColumns.push(dataIndex);
                    }
                });
                var scorecardGridColumns = _.pick(that._getGridConfig(scorecardController.getMetadata(), scorecardController.getType()), 'columns');
                var snapshotMetadata = _.assign({ visibleColumns : visibleColumns }, scorecardGridColumns, viewConfig);
                new SnapshotView(new SnapshotController(scorecardController.getStore()), scorecardController.getStore(), project, snapshotMetadata);
            });
            this._$grid.on('grid-link-clicked', function (event, context) {
                if (context.record.type !== 'project_summary' && _.includes(that._controller.getStore().projectMeasures, context.dataIndex)) {
                    var pageStore = that._controller.getStore(),
                        storeType = that._mediator.getTypeFromFilterType(pageStore.projectFilter),
                        gridWidget = that._gridWidget, otherStoreTypes = [constants.types.BUDGET_APPROVED_PROJECTS,
                            constants.types.RESOURCE_APPROVED_PROJECTS,
                            constants.types.PROJECTS];
                    var measureDialog = measureTimePhaseDialog(context.dataIndex, context.record,
                        storeType, pageStore, gridWidget, otherStoreTypes);
                    var readonlyFields = that._mediator.getReadonlyFields(context.record);
                    measureDialog.openMeasureValueModal(_.includes(readonlyFields, context.dataIndex));
                }
            });
        },

        setUpDiscussion : function (discussionOptions) {
            this._gridDiscussion = new DiscussionListener(this._$grid, {
                dataIndex : constants.fields.NAME,
                scope : discussionOptions.scope,
                contextId : this._controller.getStore().context.id,
                contextScope : discussionOptions.contextScope,
                keys : {
                    idKey : constants.fields.ID
                },
                storeFns : {
                    filter : function (record) {
                        return !_.includes([constants.types.PROJECT_SUMMARY, constants.types.RESTRICTED_PROJECTS], record.id);
                    }
                }
            });
        },

        refreshProjects : function (portfolioId) {
            var that = this;
            var dataLoadingSpinner = new SavingSpinner();
            $.when(this._controller.refreshProjectsList(portfolioId)).done(function () {
                that.updateRefreshDate();
                that._mediator.updateProjectSummaryRollups();
                that._mediator.clean();
            }).always(function () {
                dataLoadingSpinner.complete();
            });
        },

        setRefreshDate : function (date) {
            if (_.isNull(date)) {
                this.$projectFilterRefreshButton.attr('title', localizer.getFormattedString('label.cp_last_refresh',
                    localizer.getString('label.cp_not_applicable')));
                this.$projectFilterRefreshIcon.attr('title', localizer.getFormattedString('label.cp_last_refresh', localizer.getString('label.cp_not_applicable')));
            } else {
                this.$projectFilterRefreshButton.attr('title', localizer.getFormattedString('label.cp_refresh_last_refreshed', dateTimeFormatter.format(date)));
                this.$projectFilterRefreshIcon.attr('title', localizer.getFormattedString('label.cp_refresh_last_refreshed', dateTimeFormatter.format(date)));
            }
        },

        updateRefreshDate : function () {
            this.setRefreshDate(this._controller.getStore().items(constants.types.PORTFOLIO_FIELDS).lastRefreshDate);
        },

        _applyViewConfig : function (viewConfig) {
            if (viewConfig && viewConfig.columnGroups) {
                var fixedColumns = _.findWhere(viewConfig.columnGroups, { id : constants.gridLayout.fixedColumnGroup }).columns;
                if (!_.includes(fixedColumns, constants.fields.REVIEW)) {
                    fixedColumns.push(constants.fields.REVIEW);
                }
            }
            GridPanelView.prototype._applyViewConfig.apply(this, arguments);
        },

        _getViewConfig : function () {
            var viewData = GridPanelView.prototype._getViewConfig.call(this),
                gridToggleConfig = {
                    named : {},
                    user : {
                        showBackgroundColor : this.showBackgroundColor
                    }
                };
            var mcHelper = this._controller.getStore().getProjectListMultiCurrencyHelper();
            mcHelper.addMetaViewPreferences(viewData);
            if (viewData._userAndNamedSeparate) {
                return _.merge(viewData, gridToggleConfig);
            }
            return _.merge(viewData, gridToggleConfig.user, gridToggleConfig.named);
        },

        showGrid : function () {
            var context = this._controller.getStore().context,
                privileges = context.privileges;
            this.$projectSettingsBtn.removeClass('hidden');
            this._parentView.filterCombobox.element().parent().parent().show();
            this._$grid.removeClass('hidden');
            this._$grid.resize();
            this.$projectFilterRefreshButton.toggleClass('hidden', !privileges.canEdit);
            var hasCurrentApprovedBudgetPlan = this._controller.getStore().context.hasCurrentApprovedBudgetPlan;
            this._parentView._$el.find('.dock-body>.btn-toolbar').toggleClass('for-grid-with-context-menu', hasCurrentApprovedBudgetPlan);
        },

        hideGrid : function () {
            this.$projectSettingsBtn.addClass('hidden');
            this.$projectFilterRefreshButton.addClass('hidden');
            this._$grid.addClass('hidden');
        },

        updateColorToggles : function () {
            const viewConfig = this._getViewPreferences();
            this.toggleBackgroundColor((viewConfig.showBackgroundColor === undefined) ? true : viewConfig.showBackgroundColor); //default : show colors
        },

        toggleBackgroundColor : function (enable) {
            if (this.showBackgroundColor !== enable) {
                this.showBackgroundColor = enable;
                this._gridWidget.repopulate();
            }
        }
    });

    return ProjectListView;
});
