define([
    'lodash',
    'localizer',
    'bpc/page/mainDetail/GridPanelView',
    'src/portfolios/portfolioPerformanceScorecardV2/portfolioPerformanceScorecardConstants',
    'src/portfolios/portfolioPerformanceScorecardV2/model/PortfolioPerformanceScorecardMainMediator',
    'src/portfolios/portfolioPerformanceScorecardV2/view/grid/portfolioPerformanceScorecardMainGridConfig',
    'shared/discussion/DiscussionListener',
    'hbr!src/portfolios/portfolioPerformanceScorecardV2/view/templates/portfolioGrid.hbs',
    'hbr!src/portfolios/portfolioPerformanceScorecardV2/view/templates/toolbar.hbs'
], function (_, localizer, GridPanelView, constants, Mediator, gridConfig,
             DiscussionListener, panelTemplate, toolbarTemplate) {
    'use strict';

    return class PortfolioGridView extends GridPanelView {
        // eslint-disable-next-line class-methods-use-this
        getPanelTemplate () {
            return panelTemplate;
        }

        // eslint-disable-next-line class-methods-use-this
        getToolbarTemplate () {
            return toolbarTemplate;
        }

        // eslint-disable-next-line class-methods-use-this
        _getGridConfig (metadata, type) {
            return gridConfig(metadata, type, {
                mcHelper : this._controller.getStore().getPortfolioListMultiCurrencyHelper()
            }, this);
        }

        // eslint-disable-next-line class-methods-use-this
        _getMediator () {
            return Mediator;
        }

        _initComponents (...args) {
            super._initComponents(...args);
            this.discussion = new DiscussionListener(this._$grid, {
                dataIndex : 'name',
                scope : DiscussionListener.scopeEnum.GENERIC_PORTFOLIO,
                contextScope : DiscussionListener.contextScopeEnum.GENERIC_PORTFOLIO,
                contextId : this._controller.getStore().context.id,
                keys : {
                    idKey : 'id'
                },
                storeFns : {
                    filter : (record) => {
                        if (record && record.itemType === constants.types.RESTRICTED_PORTFOLIO_COUNT) {
                            return false;
                        }
                        if (record && record.itemType === constants.types.PORTFOLIO_SUMMARY) {
                            return false;
                        }
                        return true;
                    }
                }
            });
        }

        _initListeners (...args) {
            const store = this._controller.getStore();
            super._initListeners(...args);
            this.discussion.listen();
            store.getPortfolioListMultiCurrencyHelper().on('currency-changed format-changed', () => {
                store.isWorkspaceCurrencyChanged = true;
            });
        }

        _initToolbar (...args) {
            super._initToolbar(...args);
            this._$toolbar.find('.views-dropdown').replaceWith(this._parentView._parentView._pageAPI.getNamedViewPicker());
        }

        _getViewConfig () {
            const viewData = super._getViewConfig();
            const mcHelper = this._controller.getStore().getPortfolioListMultiCurrencyHelper();
            mcHelper.addMetaViewPreferences(viewData);
            return viewData;
        }

        _getGridSettingsConfig () {
            const metadata = this._controller.getMetadata();
            const columns = _.assign({}, metadata.columns[constants.meta.PORTFOLIOS], _.pick(metadata.columns[constants.meta.RM_DEMAND], 'committedUnits'),
                metadata.columns[constants.meta.PORTFOLIO_SCORECARD_DETAILS], metadata.columns[constants.meta.FN_FUND_TOTAL_COST]);
            const mcHelper = this._controller.getStore().getPortfolioListMultiCurrencyHelper();
            columns.workspaceName.columnLabel = localizer.getString('label.shared_data_associations_workspace_owner');
            return {
                columns : {
                    groupId : constants.gridLayout.flexColumnGroup,
                    allColumns : _.omit(columns, ['name', 'addedBy', 'lastModifiedBy', 'workspaceId'])
                },
                extraTabs : {
                    currency : mcHelper.getMulticurrencySettingsController()
                }
            };
        }
    };
});
