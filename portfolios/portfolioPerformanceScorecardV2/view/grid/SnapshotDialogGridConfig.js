define([
    'lodash',
    'shared/columnFactory/columnUtil',
    'src/portfolios/portfolioPerformanceScorecardV2/portfolioPerformanceScorecardConstants'
], function (_, columnUtil, constants) {
    'use strict';

    return (meta, scorecardGrid) => {
        const allColumns = meta.columns[constants.tables.SNAPSHOT_META];

        const defaultColumnOpts = {
            resizable : true,
            draggable : true,
            sortable : true,
            hideAsterisk : true
        };

        const baseColumns = {
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

        const columns = columnUtil.makeColumns({
            customizedGridColumns : columnUtil.remapKeys(allColumns, (columnDef, dataIndex) => {
                const column = baseColumns[dataIndex] ? _.assign({}, defaultColumnOpts, baseColumns[dataIndex]) : _.clone(defaultColumnOpts);
                return column;
            }),
            getColumnDefinitionFn : (dataIndex) => allColumns[dataIndex]
        });

        const scorecardColumns = scorecardGrid.columns;
        _.forEach(scorecardColumns, (column, columnName) => {
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

        const columnGroups = [
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
