define([
    'jquery',
    'lodash',
    'localizer',
    'bpc/page/mainDetail/GridPanelView',
    'src/portfolios/portfolioPerformanceScorecard/model/PortfolioListGridMediator',
    'src/portfolios/portfolioPerformanceScorecard/view/grid/portfolioListGridConfig',
    'src/portfolios/portfolioPerformanceScorecard/portfolioPerformanceScorecardConstants',
    'shared/discussion/DiscussionListener',
    'shared/gridSettingsDialog/GridSettingsDialog',
    'src/costs/projectCostSheet/projectCostSheetMcHelper'
], function ($, _, localizer, GridPanelView, Mediator, gridConfig, constants, DiscussionListener, GridSettingsDialog, ProjectCostSheetMcHelper) {
    'use strict';

    var measuresRegExp = new RegExp(constants.keys.MEASURE_PREFIX);

    function PortfolioListView (parentView, controller, model, options, panelId) {
        GridPanelView.apply(this, arguments);
        this._parentView = parentView;
        this._panelId = panelId;
    }

    PortfolioListView.prototype = _.assign(Object.create(GridPanelView.prototype), {
        constructor : PortfolioListView,

        buildElement : function () {
            return this._parentView.element().find('#portfolio-table');
        },

        _getGridConfig : function (metadata, type) {
            var that = this;
            return gridConfig(metadata, type, {
                mcHelper : that._controller.getStore().getPortfolioListMultiCurrencyHelper()
            }, this);
        },

        _getMediator : function () {
            return Mediator;
        },

        _initComponents : function () {
            this.$portfolioSettingsBtn = this._parentView._$el.find('#portfolio-settings-btn');
            if (!this.discussion) {
                this.discussion = new DiscussionListener(this._$grid, {
                    dataIndex : 'name',
                    scope : DiscussionListener.scopeEnum.GENERIC_PORTFOLIO,
                    contextScope : DiscussionListener.contextScopeEnum.GENERIC_PORTFOLIO,
                    contextId : this._controller.getStore().context.id,
                    keys : {
                        idKey : 'id'
                    },
                    storeFns : {
                        filter : function (record) {
                            if (record && record.id === constants.types.RESTRICTED_PORTFOLIO_COUNT) {
                                return false;
                            }
                            if (record && record.id === constants.types.PORTFOLIO_SUMMARY) {
                                return false;
                            }
                            return true;
                        }
                    }
                });
            }
            GridPanelView.prototype._initComponents.apply(this, arguments);
        },

        _initListeners : function () {
            var that = this;
            var store = that._controller.getStore();
            this.$portfolioSettingsBtn.on('click', function (e) {
                var metadata = that._controller.getMetadata();
                var columns = _.assign({}, metadata.columns[constants.meta.PORTFOLIOS], _.pick(metadata.columns[constants.meta.RM_DEMAND], 'committedUnits'),
                    metadata.columns[constants.meta.PORTFOLIO_SCORECARD_DETAILS], metadata.columns[constants.meta.FN_FUND_TOTAL_COST]);
                var mcHelper = that._controller.getStore().getPortfolioListMultiCurrencyHelper();
                columns.workspaceName.columnLabel = localizer.getString('label.shared_data_associations_workspace_owner');
                new GridSettingsDialog({
                    grid : that._$grid,
                    columns : {
                        allColumns : _.omit(columns, ['name', 'addedBy', 'lastModifiedBy', 'workspaceId']),
                        groupId : constants.gridLayout.flexColumnGroup
                    },
                    extraTabs : {
                        currency : mcHelper.getMulticurrencySettingsController()
                    }
                });
            });

            this._$grid.on('grid-link-clicked', function (event, context) {
                if (measuresRegExp.test(context.dataIndex)) {
                    that.showMeasureDialog(event, context);
                }
            });
            GridPanelView.prototype._initListeners.apply(this, arguments);

            this.discussion.listen();
            store.getPortfolioListMultiCurrencyHelper().on('currency-changed format-changed', function () {
                store.isWorkspaceCurrencyChanged = true;
            });
        },

        showMeasureDialog : function (event, context) {
            var that = this,
                store = that._controller.getStore(),
                measure;
            store.isMemberPortfolioMeasure = true;
            measure = _.findWhere(context.record.memberPortfolioMeasures, {
                measureId : _.trimLeft(context.dataIndex, constants.keys.MEASURE_PREFIX)
            });
            var readonlyFields = that._mediator.getReadonlyFields(context.record);
            that._parentView.openMeasureValueModal({
                capitalPortfolioId : context.record.id,
                measureId : measure.measureId,
                measureName : measure.measureName,
                capitalPortfolioName : context.record.name,
                canEdit : measure[constants.keys.DATA_TYPE] === constants.measureTypes.COST ?
                    context.record.privileges.canEditCosts : context.record.privileges.canEdit,
                portfolioMeasure : measure,
                measureModalReadOnly :_.includes(readonlyFields, context.dataIndex)
            });
            store.isMemberPortfolioMeasure = false;
        },

        showGrid : function () {
            this.$portfolioSettingsBtn.removeClass('hidden');
            this._parentView.filterCombobox.element().parent().parent().hide();
            this._$grid.removeClass('hidden');
            this._$grid.resize();
            this._parentView._$el.find('.dock-body>.btn-toolbar').removeClass('for-grid-with-context-menu');
        },

        hideGrid : function () {
            this.$portfolioSettingsBtn.addClass('hidden');
            this._$grid.addClass('hidden');
        },

        _getViewConfig : function () {
            var viewData = GridPanelView.prototype._getViewConfig.call(this);
            var mcHelper = this._controller.getStore().getPortfolioListMultiCurrencyHelper();
            var store = this._controller.getStore();
            mcHelper.addMetaViewPreferences(viewData);
            if (store.isWorkspaceCurrencyChanged) {
                store.isWorkspaceCurrencyChanged = false;
                var portfolioId = _.first(this._controller.getGridItems(constants.types.PORTFOLIOID));
                this.refreshPortfolios(portfolioId);
            }
            return viewData;
        },
        refreshPortfolios : function (portfolioId) {
            this._controller.refreshProjectsList(portfolioId);
        }
    });

    return PortfolioListView;
});
