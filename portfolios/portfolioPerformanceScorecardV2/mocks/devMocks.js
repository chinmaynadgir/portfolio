// This file is conditionally loaded, and will not be loaded
//  in production ears - perfect for development-only mock data.

define([
    'jquery',
    'pageInfo',
    'src/portfolios/portfolioPerformanceScorecardV2/portfolioPerformanceScorecardConstants',
    'mockjax'
], function ($, pageInfo, constants) {
    'use strict';

    // Just list all mocks you want loaded, but in dev-only deploys, above.
    // For mockjax API, see: https://github.com/appendto/jquery-mockjax

    $.mockjax({
        url : pageInfo.baseUrl + 'rest/fakerequest', // constants.routes.FAKE_REQUEST({})
        responseTime : 500,
        dataType : 'json',
        response : function () {
            this.responseText = [{
                id : 'project-500',
                name : 'Project 500'
            }];
        }
    });

});
