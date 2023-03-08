define([
    'lodash',
    'moment',
    'bpc/store/Mediator',
    'src/portfolios/portfolioPerformanceScorecardV2/portfolioPerformanceScorecardConstants'
], function (_, moment, BaseMediator, constants) {
    'use strict';

    return class SnapshotDialogGridMediator extends BaseMediator {
        constructor (store, widget, options) {
            store.snapshotFilter = constants.filter.ALL;
            store.getProjectListMultiCurrencyHelper().getMulticurrencySettingsController().setCurrencyType(constants.types.BASE);
            options = {};
            super(store, widget, options);
        }

        // eslint-disable-next-line class-methods-use-this
        placeRecord (item) {
            return {
                rowsetId : item.isCurrent ? 'current' : 'snapshots',
                table : '$tbody'
            };
        }

        getRecordAttributes (item, defaultAttributes) {
            const attributes = BaseMediator.prototype.getRecordAttributes.apply(this, arguments);
            this.dataIcons = {};
            attributes.editable = false;
            return attributes;
        }

        iterateStore (functionToRun, thisContext, args) {
            const that = this;

            let baseYear = moment();
            const filter = this.store.snapshotFilter;
            const [meta] = this.store.items(constants.types.META)[0];
            this.meta = meta;
            this.type = constants.types.PROJECT_SNAPSHOTS;

            if (filter === constants.filter.ALL) {
                baseYear = moment(0);
            } else if (filter === constants.filter.PAST_MONTH) {
                baseYear.subtract('months', 1);
            } else if (filter === constants.filter.PAST_SIX_MONTHS) {
                baseYear.subtract('months', 6);
            } else { // past year
                baseYear.subtract('months', 12);
            }

            _.forEach(that.store.items(
                this.type,
                (item) => item.project.id === that.store.selectedProjectId && item.time.isAfter(baseYear)
            ), (snapshot) => {
                functionToRun.call(thisContext, snapshot, args);
            });
        }

        // eslint-disable-next-line class-methods-use-this
        getValueFromRecord (item, fieldName) {
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
        }

        getRecordCount () {
            const that = this;
            const snapshotCount = _.filter(
                this.store.items(constants.types.PROJECT_SNAPSHOTS),
                (record) => record.project.id === that.store.selectedProjectId && record.name !== constants.CURRENTDATA
            );
            return _.size(snapshotCount);
        }
    };
});
