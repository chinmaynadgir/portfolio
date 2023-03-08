define([
    'jquery',
    'lodash',
    'bpc/page/singleGrid/SingleGridController',
    'src/portfolios/portfolioPerformanceScorecardV2/portfolioPerformanceScorecardConstants'
], ($, _, SingleGridController, constants) => {
    'use strict';

    return class SnapshotDialogController extends SingleGridController {
        // eslint-disable-next-line no-useless-constructor
        constructor (model) {
            super(...arguments);
        }

        getMetadata () {
            return _.first(this._model.items(constants.types.META));
        }

        // eslint-disable-next-line class-methods-use-this
        getType () {
            return constants.types.PROJECT_SNAPSHOTS;
        }

        // eslint-disable-next-line class-methods-use-this
        getViewPreferences () {
            return JSON.parse('{}');
        }

        _load (project) {
            return this._model.fetchProjectSnapshots(project);
        }
    };
});
