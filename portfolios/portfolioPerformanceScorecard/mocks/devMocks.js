// This file is conditionally loaded, and will not be loaded
//  in production ears - perfect for development-only mock data.

define([
    'jquery',
    'pageInfo',
    'src/portfolios/portfolioPerformanceScorecard/portfolioPerformanceScorecardConstants',
    'text!src/portfolios/portfolioPerformanceScorecard/mocks/projects.json',
    'text!src/portfolios/portfolioPerformanceScorecard/mocks/viewconfig.json',
    'mockjax'
], function ($, pageInfo, constants, projectsJSON, musicJSON, projectsServerJSON) {
    'use strict';

    // Just list all mocks you want loaded, but in dev-only deploys, above.

    // For mockjax API, see: https://github.com/appendto/jquery-mockjax
    $.mockjax({
        url : pageInfo.baseUrl + 'fakerest/cp/capitalPortfolioMonitoringScorecard*',
        responseTime : 0,
        dataType : 'json',
        response : function () {
            this.responseText = JSON.parse(projectsJSON);
        }
    });
    $.mockjax({
        url : pageInfo.baseUrl + 'rest/fakeviewconfig',
        responseTime : 0,
        dataType : 'json',
        response : function () {
            this.responseText = JSON.parse(musicJSON);
        }
    });
    $.mockjax({
        url : pageInfo.baseUrl + 'fakerest/fakesaveviewconfig',
        responseTime : 0,
        dataType : 'json',
        response : function () {
            this.responseText = null;
        }
    });
});
