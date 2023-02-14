// Do not rename this file.
//  **/page.js will later be used in build tasks to glom the JS for a given page
//
// Otherwise, this file shouldn't need to be changed extensively.
// Instead, please have the majority of your page's logic
//  get started in 'portfolioPerformanceScorecardV2.js'

define(['src/portfolios/portfolioPerformanceScorecardV2/portfolioPerformanceScorecard', 'jquery'], function (controller, $) {
    'use strict';

    const start = () => {
        controller.start($('.content-inner'));
    };

    const teardown = () => {
        $('.content-inner').empty();
    };

    return {
        start,
        teardown,
        config : {}
    };
});
