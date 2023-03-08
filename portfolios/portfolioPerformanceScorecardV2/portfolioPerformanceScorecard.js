define([
    'bpc/launcher',

    // MVC Classes
    'src/portfolios/portfolioPerformanceScorecardV2/model/PortfolioPerformanceScorecardModel',
    'src/portfolios/portfolioPerformanceScorecardV2/controller/PortfolioPerformanceScorecardController',
    'src/portfolios/portfolioPerformanceScorecardV2/view/PortfolioPerformanceScorecardView',
    'src/portfolios/portfolioPerformanceScorecardV2/view/PortfolioPerformanceScorecardMainView',

    // Main Panel Classes
    'src/portfolios/portfolioPerformanceScorecardV2/view/PortfolioGridView',
    'src/portfolios/portfolioPerformanceScorecardV2/view/PortfolioTiledView',

    // Detail Panel Classes
    'src/portfolios/portfolioPerformanceScorecardV2/controller/ProjectsGridController',
    'src/portfolios/portfolioPerformanceScorecardV2/view/ProjectsGridView',
    'src/portfolios/portfolioPerformanceScorecardV2/controller/ProgramsGridController',
    'src/portfolios/portfolioPerformanceScorecardV2/view/ProgramsGridView',
    'src/portfolios/portfolioPerformanceScorecardV2/controller/MeasuresController',
    'src/portfolios/portfolioPerformanceScorecardV2/view/MeasuresView',
    /* @@ADDITIONAL_DETAIL_PANEL_PLACEHOLDER_DEFINE@@ */

    // Mock Data
    'devload!src/portfolios/portfolioPerformanceScorecardV2/mocks/devMocks'
], function (
    launch,
    PortfolioPerformanceScorecardModel, PortfolioPerformanceScorecardController, PortfolioPerformanceScorecardView, PortfolioPerformanceScorecardMainView,
    PortfolioGridView, PortfolioTiledView,
    ProjectsGridController, ProjectsGridView,
    ProgramsGridController, ProgramsGridView,
    MeasuresController, MeasuresView /* @@ADDITIONAL_DETAIL_PANEL_PLACEHOLDER_IMPORT@@ */
) {
    'use strict';

    const start = ($container) => {
        launch({
            container : $container,
            headerKey : 'label_strings.properties',
            fixedSizePage : true,

            model : PortfolioPerformanceScorecardModel,

            // Developer in Prime?
            // See https://confluence.oraclecorp.com/confluence/display/PRIMEENGINEERING/Feature+Columns+Metadata
            //     for a discussion of how this is possible
            modelOptions : {
                ignoreCodes : false,
                ignoreFlex : false
            },

            controller : PortfolioPerformanceScorecardController,
            view : PortfolioPerformanceScorecardView
            ,
            viewOptions : {
                masterView : PortfolioPerformanceScorecardMainView,
                masterOptions : {
                    subViews : {
                        portfolioGridView : PortfolioGridView,
                        portfolioTiledView : PortfolioTiledView
                    }
                }
            },

            detailPanels : {
                // This key should be same as the ID of one of the panels in the dock
                // See src/portfolios/portfolioPerformanceScorecardV2/view/templates/page.hbs

                'projectsGrid-tab' : {
                    controller : ProjectsGridController,
                    view : ProjectsGridView
                },
                'programsGrid-tab' : {
                    controller : ProgramsGridController,
                    view : ProgramsGridView
                },
                'measures-tab' : {
                    controller : MeasuresController,
                    view : MeasuresView
                }/* @@ADDITIONAL_DETAIL_PANEL_PLACEHOLDER_USE@@ */
            }

        });
    };

    return {
        start
    };
});
