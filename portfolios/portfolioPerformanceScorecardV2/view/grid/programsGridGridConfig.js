define([
    'shared/columnFactory/columnUtil',
    'src/portfolios/portfolioPerformanceScorecardV2/portfolioPerformanceScorecardConstants'
], function (columnUtil, constants) {
    'use strict';

    return function (metadata, type) {
        return {
            //TODO Replace this grid config with your own. These placeholders allow your page to be immediately usable after generation.
            layout : {
                height : '100%',
                width : '100%',
                rowsets : [
                    {
                        id : constants.gridLayout.defaultRowset,
                        type : 'flex'
                    }
                ],
                columnGroups : [
                    {
                        id : constants.gridLayout.defaultColumnGroup,
                        type : 'flex',
                        columns : []
                    }
                ]
            },
            columns : {
            },
            recordKeys : {
                id : 'id'
            }
        };
    };
});
