// Do not rename this file.
//  **/page.js will later be used in build tasks to glom the JS for a given page
//
// Otherwise, this file shouldn't need to be changed extensively.
// Instead, please have the majority of your page's logic
//  get started in 'portfolioPerformanceScorecard.js'

define(['src/portfolios/portfolioPerformanceScorecard/portfolioPerformanceScorecard', 'jquery'], function (controller, $) {
    'use strict';

    var that = {};

    // Removing this line without moving it somewhere else will
    //  break Selenium tests for your page; it will treat the page as if it never loads
    // More information:
    //  REPOHOME/projects/pages/docs/yuidoc/classes/plugins.testEventing!.html
    require(['selenium:loaded']);

    function start () {
        controller.start($('.content-inner'));
    }

    function teardown () {
        $('.content-inner').empty();
    }

    that.start = start;
    that.teardown = teardown;
    that.config = {};

    return that;
});
