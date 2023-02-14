define([
    'lodash',
    'bpc/page/mainDetail/GridDetailPanelView',
    'src/portfolios/portfolioPerformanceScorecardV2/model/ProgramsGridMediator',
    'src/portfolios/portfolioPerformanceScorecardV2/view/grid/programsGridGridConfig',
    'hbr!src/portfolios/portfolioPerformanceScorecardV2/view/templates/programsGrid.hbs',
    'src/portfolios/portfolioPerformanceScorecardV2/portfolioPerformanceScorecardConstants'
], function (_, GridDetailPanelView, Mediator, gridConfig, markup, constants) {
    'use strict';

    return class ProgramsGridView extends GridDetailPanelView {
        // eslint-disable-next-line class-methods-use-this
        getPanelTemplate () {
            return markup;
        }

        // eslint-disable-next-line class-methods-use-this
        _getGridConfig (metadata, type) {
            return gridConfig(metadata, type);
        }

        // eslint-disable-next-line class-methods-use-this
        _getMediator () {
            return Mediator;
        }
    };
});
