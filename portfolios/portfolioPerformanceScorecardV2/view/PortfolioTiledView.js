define([
    'lodash',
    'bpc/page/mainDetail/MultiMainPanelView',
    'src/portfolios/portfolioPerformanceScorecardV2/model/PortfolioPerformanceScorecardMainMediator',
    'hbr!src/portfolios/portfolioPerformanceScorecardV2/view/templates/portfolioTile.hbs',
    'hbr!src/portfolios/portfolioPerformanceScorecardV2/view/templates/toolbar.hbs'
], function (_, MultiMainPanelView, Mediator, panelTemplate, toolbarTemplate) {
    'use strict';

    return class PortfolioTiledView extends MultiMainPanelView {
        // eslint-disable-next-line class-methods-use-this
        getPanelTemplate () {
            return panelTemplate;
        }

        // eslint-disable-next-line class-methods-use-this
        getToolbarTemplate () {
            return toolbarTemplate;
        }
    };
});
