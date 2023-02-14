define([
    'lodash',
    'bpc/store/Mediator',
    'src/portfolios/portfolioPerformanceScorecardV2/portfolioPerformanceScorecardConstants',
    'primutils/utils/nestedPropertyAccessors'
], function (_, BaseMediator, constants, accessors) {
    'use strict';

    return class ProgramsGridMediator extends BaseMediator {
        // eslint-disable-next-line class-methods-use-this
        placeRecord () {
            return {
                rowsetId : constants.gridLayout.defaultRowset,
                table : '$tbody'
            };
        }

        // eslint-disable-next-line class-methods-use-this
        getValueFromRecord (record, dataIndex) {
            //TODO remove this if you would prefer the flat behavior from bpc/store/Mediator
            // See also https://confluence.oraclecorp.com/confluence/display/PRIMEENGINEERING/Feature+Columns+Metadata
            return accessors.getValue(record, dataIndex);
        }
    };
});
