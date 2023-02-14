define([
    'lodash',
    'logger',
    'bpc/page/mainDetail/DetailPanelController',
    'src/portfolios/portfolioPerformanceScorecardV2/portfolioPerformanceScorecardConstants'
], function (_, logger, DetailPanelController, constants) {
    'use strict';

    return class MeasuresController extends DetailPanelController {
        // eslint-disable-next-line class-methods-use-this
        _load (record) {
            //TODO implement your load logic here
        }
    };
});
