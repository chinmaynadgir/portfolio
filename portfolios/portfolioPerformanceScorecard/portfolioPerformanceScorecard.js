define([
    'bpc/launcher',

    // MVC Classes
    'src/portfolios/portfolioPerformanceScorecard/model/PortfolioPerformanceScorecardModel',
    'src/portfolios/portfolioPerformanceScorecard/controller/PortfolioPerformanceScorecardController',
    'src/portfolios/portfolioPerformanceScorecard/view/PortfolioPerformanceScorecardView',

    // Mock Data
    'devload!src/portfolios/portfolioPerformanceScorecard/mocks/devMocks'
], function (launch,
             PortfolioPerformanceScorecardModel, PortfolioPerformanceScorecardController, PortfolioPerformanceScorecardView) {
    'use strict';

    var that = {};

    function start ($container) {
        launch({
            container : $container,
            fixedSizePage : true,

            model : PortfolioPerformanceScorecardModel,
            modelOptions : {
                ignoreCodes : false,
                ignoreFlex : false
            },
            controller : PortfolioPerformanceScorecardController,
            view : PortfolioPerformanceScorecardView

        });
    }

    that.start = start;
    return that;
});
