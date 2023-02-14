define([
    'lodash',
    'logger',
    'bpc/page/mainDetail/MainDetailController',
    'src/portfolios/portfolioPerformanceScorecardV2/portfolioPerformanceScorecardConstants',
    'shared/views/NamedViewManager'
], function (_, logger, MainDetailController, constants, NamedViewManager) {
    'use strict';

    return class PortfolioPerformanceScorecardController extends MainDetailController {
        constructor (...args) {
            super(...args);
            this._namedViewManager = new NamedViewManager(this, {
                pageType : 'PROJECT_PORTFOLIO_MONITOR_SCORECARD'
            });
        }

        // eslint-disable-next-line class-methods-use-this
        getType () {
            return constants.types.PORTFOLIO;
        }

        _load () {
            return this._model.initialLoad();
        }

        getMetadata () {
            return this._model.getMetadata();
        }

        getGridItems (type) {
            return this._model.items(type);
        }

        _saveView (viewConfig, onPageLeave) {
            return this._model.saveView(viewConfig, onPageLeave);
        }

        _save (data) {
            if (_.has(data, constants.types.BUDGET_APPROVED_PROJECTS)) {
                data[constants.types.PROJECTS] = data[constants.types.BUDGET_APPROVED_PROJECTS];
                delete data[constants.types.BUDGET_APPROVED_PROJECTS];
            } else if (_.has(data, constants.types.RESOURCE_APPROVED_PROJECTS)) {
                data[constants.types.PROJECTS] = data[constants.types.RESOURCE_APPROVED_PROJECTS];
                delete data[constants.types.RESOURCE_APPROVED_PROJECTS];
            }
            return this._model.saveData(data);
        }
    };
});
