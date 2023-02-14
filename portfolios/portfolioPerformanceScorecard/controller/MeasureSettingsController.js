define([
    'lodash',
    'localizer',
    'src/portfolios/portfolioPerformanceScorecard/view/MeasureSettingsView'
], function (_, localizer, MeasureSettingsView) {
    'use strict';

    var DEFAULT_OPTIONS = {
        commit : _.noop, // actual commit to grid goes here

        multiView : {
            commit : function (viewData, visibleMeasures) {
                // actual commit to named view goes here

                viewData.visibleMeasures = _.pluck(visibleMeasures, 'id');
            }
        }
    };

    function MeasureSettingsController ($tab, gridSettingsDialog, options) {
        this._options = _.defaultsDeep({}, options, DEFAULT_OPTIONS);
        this.view = new MeasureSettingsView($tab, this, options);
    }

    MeasureSettingsController.prototype = {
        constructor : MeasureSettingsController,

        shown : function () {
            return this.view.shown();
        },

        commit : function () {
            this._options.commit(this.view.getSaveData());
        },

        commitMultiView : function (viewData) {
            this._options.multiView.commit.call(null, viewData, this.view.getSaveData());
        }
    };

    MeasureSettingsController.getDefaultName = function () {
        return localizer.getString('label.ms_settings_measures');
    };

    MeasureSettingsController.getMultiViewOptionOverrides = function (viewData, viewId, originalOptions, grid, viewInfo) {
        if (_.isEmpty(viewInfo.view.visibleMeasures)) {
            return { selected : [] };
        }
        var retArr = [];
        _.forEach(viewInfo.view.visibleMeasures, function (value, key) {
            var obj = _.find(originalOptions.available, function (obj) {
                return obj.id === value;
            });
            if (obj) {
                retArr.push(obj);
            }
        });
        return { selected : retArr };
    };

    MeasureSettingsController.getNewRecordOptionOverrides = function () {
        return {};
    };

    return MeasureSettingsController;
});
