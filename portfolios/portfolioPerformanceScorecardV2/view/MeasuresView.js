define([
    'lodash',
    'bpc/page/mainDetail/DetailPanelView',
    'hbr!src/portfolios/portfolioPerformanceScorecardV2/view/templates/measures.hbs',
    'src/portfolios/portfolioPerformanceScorecardV2/portfolioPerformanceScorecardConstants'
], function (_, DetailPanelView, markup, constants) {
    'use strict';

    return class MeasuresView extends DetailPanelView {
        // eslint-disable-next-line class-methods-use-this
        getPanelTemplate () {
            return markup;
        }
    };
});
