define([
    'lodash',
    'jquery',
    'logger',
    'bpc/page/singleGrid/SingleGridController',
    'shared/views/NamedViewManager',
    'src/portfolios/portfolioPerformanceScorecard/portfolioPerformanceScorecardConstants'
], function (_, $, logger, SingleGridController, NamedViewManager, constants) {
    'use strict';

    function PortfolioPerformanceScorecardController (model, options) {
        SingleGridController.call(this, model, options);
        this._namedViewManager = new NamedViewManager(this, {
            pageType : 'PROJECT_PORTFOLIO_MONITOR_SCORECARD'
        });
    }

    PortfolioPerformanceScorecardController.prototype = _.assign(Object.create(SingleGridController.prototype), {
        constructor : PortfolioPerformanceScorecardController,

        getType : function () {
            var type, filterType = this._model.projectFilter;
            switch (filterType) {
                case constants.projectFilterTypes.BUDGET_APPROVED:
                    type = constants.types.BUDGET_APPROVED_PROJECTS;
                    break;
                case constants.projectFilterTypes.RESOURCE_APPROVED:
                    type = constants.types.RESOURCE_APPROVED_PROJECTS;
                    break;
                default:
                    type = constants.types.PROJECTS;
            }

            return type;
        },
        _load : function () {
            return this._model.loadProjects();
        },
        getMetadata : function () {
            return this._model.getMetadata();
        },
        getMeasures : function () {
            return { measure : _.cloneDeep(this._model.items(constants.types.MEASURES)) };
        },
        getGridItems : function (type) {
            return this._model.items(type);
        },
        getPortfolioFields : function () {
            return _.cloneDeep(this._model.items(constants.types.KPI, function (item) {
                return item.type === constants.kpis.PORTFOLIO_FIELDS;
            }));
        },
        getViewConfig : function () {
            return this.jsonSafe(this.getMetadata().view.single);
        },
        getSelectedMeasures : function () {
            var selected = this.getViewPreferences().visibleMeasures;

            // convert measures to measureIds
            return _.map(selected, function (measure) {
                return _.isObject(measure) ? measure.id : measure;
            });
        },
        getViewSettings : function () {
            return this.getStore().getViewSettings();
        },
        getMeasureViewSettings : function () {
            var defaultVal = 'value-icon';
            var retVal = this.getViewPreferences().otherSettings;
            if (retVal === undefined) {
                return defaultVal;
            }
            retVal = retVal.measureView;
            if (retVal === undefined) {
                return defaultVal;
            }
            return retVal;
        },
        jsonSafe : function (jsonStr) {
            if (jsonStr === undefined) {
                return jsonStr;
            }
            return JSON.parse(jsonStr);
        },
        saveSelectedMeasuresViewConfig : function (selectedMeasures) {
            this._model.saveSelectedMeasuresViewConfig(selectedMeasures);
        },
        _save : function (data) {
            if (_.has(data, constants.types.BUDGET_APPROVED_PROJECTS)) {
                data[constants.types.PROJECTS] = data[constants.types.BUDGET_APPROVED_PROJECTS];
                delete data[constants.types.BUDGET_APPROVED_PROJECTS];
            } else if (_.has(data, constants.types.RESOURCE_APPROVED_PROJECTS)) {
                data[constants.types.PROJECTS] = data[constants.types.RESOURCE_APPROVED_PROJECTS];
                delete data[constants.types.RESOURCE_APPROVED_PROJECTS];
            }
            return this._model.saveData(data);
        },
        _saveView : function (viewConfig, onPageLeave) {
            return this._model.saveView(viewConfig, onPageLeave);
        },
        saveOtherSettings : function (key, value) {
            this._model.saveOtherSettings(key, value);
        },
        recalcMeasureData : function () {
            this._model.recalcMeasureData();
        },
        getLastCalculatedDate : function () {
            return _.first(this._model.items(constants.types.LASTCALCULATEDDATE));
        },
        getPortfolioId : function () {
            return this.getStore().getPortfolioId();
        },
        setViewOptionsToStore : function () {
            this._model.otherSettings = this.getViewPreferences().otherSettings;
            this._model.selectedMeasures = this.getViewPreferences().selectedMeasures;
        },
        getContextInfo : function () {
            return this.getStore().getContextInfo();
        },
        refreshProjectsList : function (portfolioId) {
            if (this._model.isDirty()) {
                return;
            }
            return this._model.refreshProjectsList(portfolioId);
        },
        getPortfolioMeasure : function (measureId) {
            var that = this;
            return _.findWhere(this.getStore().items(constants.types.PORTFOLIO_MEASURES),
                { measureId : measureId.toString(), portfolioId : that.getPortfolioId().toString() });
        }
    });

    return PortfolioPerformanceScorecardController;
});
