define([
    'lodash',
    'localizer',
    'src/portfolios/portfolioPerformanceScorecard/view/SparklineSettingsView'
], function (_, localizer, SparkLineSettingsView) {
    'use strict';

    var DEFAULT_OPTIONS = {
        commit : _.noop, // actual commit to grid goes here

        multiView : {
            commit : function (viewData, data) {
                // actual commit to named view goes here

                viewData.otherSettings.enableSparklines = data.enableSparklines;
                viewData.otherSettings.highlightHighLowValue = data.highlightHighLowValue;
                viewData.otherSettings.sparklinePeriods = data.sparklinePeriods;
            }
        }
    };

    function SparkLineSettingsController ($tab, gridSettingsDialog, options) {
        this._options = _.defaultsDeep({}, options, DEFAULT_OPTIONS);
        this.dialog = gridSettingsDialog;
        this.view = new SparkLineSettingsView($tab, this, options);
    }

    SparkLineSettingsController.prototype = {
        constructor : SparkLineSettingsController,

        shown : function () {
            return this.view.shown();
        },

        commit : function () {
            this._options.commit(this.view.getSaveData());
        },

        commitMultiView : function (viewData) {
            this._options.multiView.commit.call(null, viewData, this.view.getSaveData());
        },

        toggleError : function (errorName, valid) {
            this.dialog.toggleError('sparkChart', !valid);
        }
    };

    SparkLineSettingsController.getDefaultName = function () {
        return localizer.getString('label.ms_settings_spark_lines');
    };

    SparkLineSettingsController.getMultiViewOptionOverrides = function (viewData, viewId, originalOptions, grid, viewInfo) {
        return {
            data : {
                enableSparklines : viewInfo.view.otherSettings.enableSparklines,
                highlightHighLowValue : viewInfo.view.otherSettings.highlightHighLowValue,
                sparklinePeriods : viewInfo.view.otherSettings.sparklinePeriods
            }
        };
    };

    SparkLineSettingsController.getNewRecordOptionOverrides = function () {
        return {
            enableSparklines : true,
            highlightHighLowValue : true,
            sparklinePeriods : 10
        };
    };

    return SparkLineSettingsController;
});
