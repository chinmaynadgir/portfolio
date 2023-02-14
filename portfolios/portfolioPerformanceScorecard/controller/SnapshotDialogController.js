define([
    'jquery',
    'lodash',
    'bpc/page/singleGrid/SingleGridController',
    'src/portfolios/portfolioPerformanceScorecard/portfolioPerformanceScorecardConstants'
], function ($, _, SingleGridController, constants) {
    'use strict';

    function SnapshotDialogController (model) {
        SingleGridController.apply(this, arguments);
    }

    SnapshotDialogController.prototype = _.assign(Object.create(SingleGridController.prototype), {
        constructor : SnapshotDialogController,

        getMetadata : function () {
            return _.first(this._model.items(constants.types.META));
        },

        getType : function () {
            return constants.types.PROJECT_SNAPSHOTS;
        },

        getViewPreferences : function () {
            return JSON.parse('{}');
        },

        _load : function (project) {
            return this._model.fetchProjectSnapshots(project);
        }

    });

    return SnapshotDialogController;
});
