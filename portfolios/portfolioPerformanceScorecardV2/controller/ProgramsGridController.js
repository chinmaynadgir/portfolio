define([
    'lodash',
    'logger',
    'bpc/page/mainDetail/GridDetailPanelController',
    'src/portfolios/portfolioPerformanceScorecardV2/portfolioPerformanceScorecardConstants'
], function (_, logger, GridDetailPanelController, constants) {
    'use strict';

    return class ProgramsGridController extends GridDetailPanelController {
        // eslint-disable-next-line class-methods-use-this
        getType () {
            return constants.types.PORTFOLIO;
        }

        // eslint-disable-next-line class-methods-use-this
        _load (record) {
            //TODO implement your load logic here
        }
    };
});
