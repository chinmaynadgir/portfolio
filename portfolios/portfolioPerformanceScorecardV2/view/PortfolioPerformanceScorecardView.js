define([
    'lodash',
    'bpc/page/mainDetail/MainDetailView',
    'hbr!src/portfolios/portfolioPerformanceScorecardV2/view/templates/page.hbs'
], function (_, MainDetailView, pageTemplate) {
    'use strict';

    return class PortfolioPerformanceScorecardView extends MainDetailView {
        // eslint-disable-next-line class-methods-use-this
        getPageTemplate () {
            return pageTemplate;
        }

        settings () {
            this._masterView._subViews.portfolioGridView.settings();
        }
    };
});
