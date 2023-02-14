define([
    'lodash',
    'moment',
    'bpc/store/Mediator',
    'src/portfolios/portfolioPerformanceScorecard/portfolioPerformanceScorecardConstants'
], function (_, moment, BaseMediator, constants) {
    'use strict';

    // var meta;

    function SnapshotDialogGridMediator (store, widget, options) {
        store.snapshotFilter = constants.filters.ALL;
        store.getProjectListMultiCurrencyHelper().getMulticurrencySettingsController().setCurrencyType(constants.types.BASE);
        options = {};
        BaseMediator.call(this, store, widget, options);
    }

    SnapshotDialogGridMediator.prototype = _.assign(Object.create(BaseMediator.prototype), {
        constructor : SnapshotDialogGridMediator,

        placeRecord : function (item) {
            return {
                rowsetId : item.isCurrent ? 'current' : 'snapshots',
                table : '$tbody'
            };
        },

        getRecordAttributes : function (item, defaultAttributes) {
            var attributes = BaseMediator.prototype.getRecordAttributes.apply(this, arguments);
            this.dataIcons = {};
            attributes.editable = false;
            return attributes;
        },

        iterateStore : function (functionToRun, thisContext, args) {
            var that = this;

            var baseYear = moment(),
                filter = this.store.snapshotFilter;
            this.meta = this.store.items(constants.types.META)[0];
            this.type = constants.types.PROJECT_SNAPSHOTS;

            if (filter === constants.filters.ALL) {
                baseYear = moment(0);
            } else if (filter === constants.filters.PAST_MONTH) {
                baseYear.subtract('months', 1);
            } else if (filter === constants.filters.PAST_SIX_MONTHS) {
                baseYear.subtract('months', 6);
            } else { // past year
                baseYear.subtract('months', 12);
            }

            _.forEach(that.store.items(this.type, function (item) {
                return item.project.id === that.store.selectedProjectId && item.time.isAfter(baseYear);
            }), function (snapshot) {
                functionToRun.call(thisContext, snapshot, args);
            });
        },

        getValueFromRecord : function (item, fieldName) {
            if (fieldName === 'name' || fieldName === 'time' || fieldName === 'id') {
                return item[fieldName];
            }
            if (fieldName === 'parentId') {
                return item.project.parentName;
            }
            if (fieldName === 'committedDuration') {
                return item.project.commitDuration;
            }
            return _.get(item.project, fieldName);
        },

        getRecordCount : function () {
            var that = this,
                snapshotCount = _.filter(this.store.items(constants.types.PROJECT_SNAPSHOTS), function (record) {
                    return record.project.id === that.store.selectedProjectId && record.name !== constants.CURRENTDATA;
                });
            return _.size(snapshotCount);
        }

    });

    return SnapshotDialogGridMediator;
});
