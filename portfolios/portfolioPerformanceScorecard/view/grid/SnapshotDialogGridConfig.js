define([
    'lodash',
    'shared/columnFactory/columnUtil',
    'src/portfolios/portfolioPerformanceScorecard/portfolioPerformanceScorecardConstants'
], function (_, columnUtil, constants) {
    'use strict';

    return function (meta, scorecardGrid) {
        var allColumns = meta.columns[constants.tables.SNAPSHOT_META];

        var defaultColumnOpts = {
            resizable : true,
            draggable : true,
            sortable : true,
            hideAsterisk : true
        };

        var baseColumns = {
            name : {
                dataIndex : 'name',
                width : '150px',
                visible : true
            },
            time : {
                dataIndex : 'time',
                width : '150px',
                visible : true
            }
        };

        var columns = columnUtil.makeColumns({
            customizedGridColumns : columnUtil.remapKeys(allColumns, function (columnDef, dataIndex) {
                var column = baseColumns[dataIndex] ? _.assign({}, defaultColumnOpts, baseColumns[dataIndex]) : _.clone(defaultColumnOpts);
                return column;
            }),
            getColumnDefinitionFn : function (dataIndex) {
                return allColumns[dataIndex];
            }
        });

        var scorecardColumns = scorecardGrid.columns;
        _.forEach(scorecardColumns, function (column, columnName) {
            if (_.includes(scorecardGrid.visibleColumns, columnName)) {
                column.visible = true;
            }
            if (!_.includes(['name', 'time'], columnName)) {
                if (columnName === 'code') {
                    column.unique = false;
                }
                columns[columnName] = column;
            }
        });

        var columnGroups = [
            {
                id : 'static',
                type : 'fixed',
                columns : ['name', 'time']
            },
            {
                id : 'customize',
                type : 'flex',
                columns : scorecardGrid.columnGroups[1].columns
            }
        ];

        return {
            inModal : true,
            editable : true,
            layout : {
                height : '100%',
                width : '100%',
                autoResize : true,
                rowsets : [
                    {
                        id : 'current',
                        type : 'fixed',
                        excludeRecordCount : true
                    },
                    {
                        id : 'snapshots',
                        type : 'flex'
                    }
                ],
                columnGroups : columnGroups
            },
            sortBy : [{
                dataIndex : 'time',
                order : 'desc'
            }],
            selection : {
                multi : false
            },
            columns : columns,
            recordKeys : {
                id : 'id'
            }
        };
    };
});
