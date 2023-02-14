define([
    'jquery',
    'lodash',
    'oui',
    'localizer',
    'userFormatters',
    'hbr!src/portfolios/portfolioPerformanceScorecard/view/templates/sparklineSettings.hbs',
    'src/portfolios/portfolioPerformanceScorecard/portfolioPerformanceScorecardConstants'
], function ($, _, oui, localizer, userFormatters, template, constants) {
    'use strict';

    function SparkLineSettingsView ($tab, Controller, options) {
        this._$el = $tab;
        this._controller = Controller;
        this.options = options || {};
        this.init();
    }

    SparkLineSettingsView.prototype = {
        constructor : SparkLineSettingsView,

        getTabTemplate : function () {
            return template;
        },

        buildElement : function () {
            return $(this.getTabTemplate()({
                lz : localizer
            }));
        },

        init : function () {
            this.initComponents();
            this.initListeners();
        },

        initComponents : function () {
            this._$el.append(this.buildElement());
            this.toggleSparkline = new oui.Checkbox({}, this._$el.find('[for=toggle-sparklines]'), this.options.data && !!this.options.data.enableSparklines);
            this.sparklinePeriod = new oui.NumberField({
                required : true,
                min : constants.MIN_PERIODS,
                max : constants.MAX_PERIODS,
                spinner : {
                    controls : true
                },
                formatter : userFormatters.genericIntegerFormatter
            }, this._$el.find('#sparkilne-period'), this.options.data.sparklinePeriods || constants.MIN_PERIODS);
            this.highlightHighLowValue = new oui.Checkbox({}, this._$el.find('[for=toggle-high-low-marker]'), this.options.data.highlightHighLowValue);

            this.sparklinePeriod.disable(!this.toggleSparkline.value());
            this.highlightHighLowValue.disable(!this.toggleSparkline.value());
        },

        initListeners : function () {
            var that = this;

            this.toggleSparkline.on('change', function (value) {
                that.sparklinePeriod.disable(!value);
                that.highlightHighLowValue.disable(!value);
                if (!that.sparklinePeriod.isValid()) {
                    that.sparklinePeriod.data(that.options.data.sparklinePeriods);
                }
                that.markTabDirty();
            });

            this.sparklinePeriod.on('change error', function () {
                var helpText = '';
                if (!that.sparklinePeriod.isValid()) {
                    helpText = localizer.getFormattedString('label.ms_sparkline_periods_error_message', constants.MIN_PERIODS, constants.MAX_PERIODS);
                }
                that.getHelpBlock(that.sparklinePeriod).text(helpText);
                that.getHelpBlock(that.sparklinePeriod).toggleClass('hidden', that.sparklinePeriod.isValid());
                that.markTabDirty();
                that.toggleError('period_invalid', that.sparklinePeriod.isValid());
            });

            this.highlightHighLowValue.on('change', this.markTabDirty.bind(this));
        },

        toggleError : function (errorName, valid) {
            this._controller.toggleError(errorName, valid);
        },

        markTabDirty : function () {
            this._controller.markTabDirty();
        },

        getHelpBlock : function (input) {
            return input.element().parent().find('.help-block');
        },

        getSaveData : function () {
            return {
                enableSparklines : this.toggleSparkline.value(),
                sparklinePeriods : this.sparklinePeriod.value(),
                highlightHighLowValue : this.highlightHighLowValue.value()
            };
        },

        shown : function () {
            this.toggleSparkline.init();
            this.sparklinePeriod.init();
            this.highlightHighLowValue.init();
        }
    };

    return SparkLineSettingsView;
});
