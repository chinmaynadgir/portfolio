define([
    'lodash',
    'logger',
    'bpc/page/mainDetail/GridDetailPanelController',
    'src/portfolios/portfolioPerformanceScorecardV2/portfolioPerformanceScorecardConstants'
], function (_, logger, GridDetailPanelController, constants) {
    'use strict';

    return class ProjectsGridController extends GridDetailPanelController {
        // eslint-disable-next-line class-methods-use-this
        getType () {
            return constants.types.PROJECTS;
        }

        _load (record) {
            return this._model.loadProjects(record.id);
        }
    };
});
