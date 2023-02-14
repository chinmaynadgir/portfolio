define([
    'lodash',
    'bpc/page/mainDetail/MultiMainView',
    'hbr!src/portfolios/portfolioPerformanceScorecardV2/view/templates/portfolioPerformanceScorecardMain.hbs'
], function (_, MultiMainView, panelTemplate) {
    'use strict';

    return class PortfolioPerformanceScorecardMainView extends MultiMainView {
        // eslint-disable-next-line class-methods-use-this
        getPanelTemplate () {
            return panelTemplate;
        }
    };
});
