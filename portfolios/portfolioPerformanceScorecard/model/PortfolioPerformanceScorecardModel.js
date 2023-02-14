define([
    'jquery',
    'lodash',
    'pageInfo',
    'moment',
    'userFormatters',
    'bpc/store/Store',
    'primutils/utils/urls',
    'primutils/ui/dialogs/AJAXErrorHandler',
    'shared/constants/logicalDataTypes',
    'shared/multicurrency/Helper',
    'src/portfolios/portfolioPerformanceScorecard/portfolioPerformanceScorecardConstants',
    'localizer',
    'shared/discussion/DiscussionListener',
    'shared/fields/dateFields',
    'packages/metadata/MetadataBuilder',
    'shared/fields/fieldUtil'
], function ($, _, pageInfo, moment, userFormatters, BaseStore, urls, AJAXErrorHandler, logicalDataTypes, MultiCurrencyHelper, constants,
             localizer, DiscussionListener, dateFields, MetadataBuilder, fieldUtil) {
    'use strict';

    function PortfolioPerformanceScorecardStore (options) {
        options = _.assign({}, options, {
            flexTextKey : constants.keys.flexTextKey,
            flexCostKey : constants.keys.flexCostKey,
            flexOtherKey : constants.keys.flexOtherKey,
            codeKey : constants.keys.codeKey
        });
        options.timezoneSensitiveDateFormatter = userFormatters.timezoneSensitiveDateTimeFormatter;
        BaseStore.call(this, options);
        this.projectSnapshots = {};
        this.kpiFields = [];
        this.portfolioKpi = [];
        this.costMeasureFields = [];
        this.projectListMultiCurrencyHelper = new MultiCurrencyHelper({
            areCostFieldsModified : false,
            viewPrefix : 'projectList',
            getMCToolbar : function () {
                return $('#project-table').prev();
            }
        });
        this.portfolioListMultiCurrencyHelper = new MultiCurrencyHelper({
            areCostFieldsModified : false,
            viewPrefix : 'portfolioList',
            getMCToolbar : function () {
                return $('#project-table').prev();
            }
        });
        this.isWorkspaceCurrencyChanged = false;
    }

    var DEFAULT_FILTER = {
        match : 'ALL',
        rows : []
    };

    /* workaround to deal with the server retaining old owner RO while the grid uses the join column with a generic picker */
    var OWNER_CONVERTER = {
        type : constants.owner_converter.type,
        separator : constants.owner_converter.separator,
        serialize : function (item) {
            if (!item[constants.fields.OWNER]) {
                return;
            }
            var id = item[constants.fields.OWNER].id;
            item[constants.fields.OWNER].id = id.slice(0, id.indexOf(this.separator + this.type));
            delete item[constants.fields.OWNER].type;
            delete item[constants.fields.OWNER].displayName;
        },
        unserialize : function (item) {
            if (!item[constants.fields.OWNER]) {
                return;
            }
            if (item[constants.fields.OWNER].id) {
                item[constants.fields.OWNER].id = item[constants.fields.OWNER].id + this.separator + this.type;
                item[constants.fields.OWNER].type = this.type;
                item[constants.fields.OWNER].displayName = item[constants.fields.OWNER].name;
            } else {
                delete item[constants.fields.OWNER];
            }
        }
    };

    PortfolioPerformanceScorecardStore.prototype = _.assign(Object.create(BaseStore.prototype), {

        constructor : PortfolioPerformanceScorecardStore,

        addMetadata : function (meta) {
            var multicurrencyMeta = MultiCurrencyHelper.pickMetaFields(meta);
            if (!_.isUndefined(multicurrencyMeta.view) && !_.isNull(multicurrencyMeta.view)) {
                var viewObj = JSON.parse(multicurrencyMeta.view);
                if (viewObj != null) {
                    var projPortListObj = _.pick(viewObj.userView, [constants.keys.PROJECT_LIST_VIEW, constants.keys.PORTFOLIO_LIST_VIEW]);
                    multicurrencyMeta.view = JSON.stringify(projPortListObj);
                }
            }
            this.projectListMultiCurrencyHelper.setMeta(multicurrencyMeta);
            this.portfolioListMultiCurrencyHelper.setMeta(multicurrencyMeta);
            var injectResults = fieldUtil.injectStoreMeta({
                multicurrencyHelper : this.projectListMultiCurrencyHelper,
                meta : meta.columns,
                store : this
            });
            this.projectListMultiCurrencyHelper.processStoreInjection(injectResults);
            this.portfolioListMultiCurrencyHelper.processStoreInjection(injectResults);
            meta = _.omit(meta, MultiCurrencyHelper.getMetaFields());
            var metadata = _.omit(meta, 'views', 'view', 'viewMeta');
            metadata.id = '1';
            this.add(constants.types.META, metadata);
            this.initializeNamedViews(meta.views, meta.view, meta.viewMeta);
        },

        modifyFundColumnsMeta : function () {
            var meta = _.first(this.items(constants.types.META)),
                fundColumns = _.merge(meta.columns.FN_FUND_TOTAL_COST, meta.columns.CP_PROJ_FUND);

            _.forEach(fundColumns, function (columnDef, dataIndex) {
                var title = localizer.getFormattedString('label.global_fund_field_label', columnDef.columnLabel);
                fundColumns[dataIndex].columnLabel = title;
            });
        },

        loadProjects : function () {
            var that = this, dfd = $.Deferred();
            this.projectFilter = constants.projectFilterTypes.ALL;
            var builder = new MetadataBuilder(MetadataBuilder.constants.pages.projectInventory);
            $.when(this.utilities.GETWithContext(constants.routes.PROJECTS({})), builder.loadMetadata(), that.fetchContextInfo())
                .done(function (response, metaData) {
                    response = _.first(response);
                    var projectData = that.getData(response.data[constants.types.PROJECTS]);
                    var portfolioData = that.getData(response.data[constants.types.PORTFOLIO]);
                    var restrictedProjectsExist = !_.isUndefined(response.data[constants.types.RESTRICTED_PROJECTS]) &&
                        response.data[constants.types.RESTRICTED_PROJECTS] > 0;
                    var restrictedPortfoliosExist = !_.isUndefined(response.data[constants.types.RESTRICTED_PORTFOLIO_COUNT]) &&
                        response.data[constants.types.RESTRICTED_PORTFOLIO_COUNT] > 0;
                    if (_.isEmpty(projectData) && _.isEmpty(portfolioData) && !restrictedProjectsExist && !restrictedPortfoliosExist) {
                        return dfd.resolve();
                    }
                    that.getPortfolioMeasures(that.context.id);
                    that.addMetadata(response.meta);
                    that.modifyFundColumnsMeta();
                    var meta = that.getMetadata();
                    var columns = meta.columns;
                    that.projectColumns = _.assign({}, columns[constants.meta.CO_PROJECT], columns[constants.meta.CO_CODE_TYPE_DATA],
                        columns[constants.meta.RM_DEMAND_R], columns[constants.meta.SA_PROJ_ALIGN_SCORE], columns[constants.meta.RM_DEMAND_COST_R],
                        columns[constants.meta.PROJECT_MEASURE]);
                    that.projectDateFields = dateFields(_.assign({}, response.meta.columns[constants.meta.CO_PROJECT],
                        response.meta.columns[constants.meta.RM_DEMAND_R]));
                    that.setDateFields(constants.types.PROJECTS, that.projectDateFields);
                    meta.columns[constants.ros.PROJECT_MEASURE_RO] = metaData[constants.meta.PROJECT_MEASURE_INVENTORY];
                    that.projectMeasures = [];
                    that.addAll(constants.types.PROJECTS, projectData, function (type, item) {
                        var fundFields = _.omit(item.funds, 'id');
                        item = _.merge(item, fundFields);
                        _.forEach(item.projectMeasureDataMap, function (measure, key) {
                            item[key] = measure.measureValue;
                            item[key + 'Attr'] = measure;
                            that.projectMeasures.push(key);
                        });
                        return item;
                    }, that.projectDateFields);
                    that.addAll(constants.types.PROJECT_MEASURES, response.data[constants.types.PROJECT_MEASURES]);
                    that.addAll(constants.types.MEASURES, response.data[constants.types.MEASURES]);
                    _.forEach(response.data[constants.types.MEASURES], function (measure) {
                        if (measure[constants.keys.MEASURE_TYPE] === constants.measureTypes.COST) {
                            that.costMeasureFields.push(constants.keys.MEASURE_PREFIX + measure[constants.keys.ID]);
                        }
                    });

                    _.forEach(response.data.codes, function (codes, id) {
                        _.forEach(codes, function (code) {
                            if (_.isUndefined(code.parentId)) {
                                code[constants.fields.PARENT_ID] = null;
                            }
                        });
                        var type = constants.codeType.CO_CODE_TYPE + id;
                        that.addAll(type, codes);
                    });
                    _.forEach(response.data.kpis, function (kpis) {
                        that.addAll(constants.types.KPI, kpis, function (type, item) {
                            var columnId = item.columnId;
                            if (columnId) {
                                var fieldName = that.getColumnDefinition(columnId).fieldName;
                                if (!_.includes(that.kpiFields, fieldName)) {
                                    that.kpiFields.push(fieldName);
                                }
                                return item;
                            }
                        });
                    });

                    that.add(constants.types.PORTFOLIO_FIELDS, response.data.portfolioScorecardDetails, function (type, item) {
                        item.id = '1';
                        var fundFields = _.omit(item.funds, 'id');
                        item = _.merge(item, fundFields);
                        delete item.funds;
                        return item;
                    });
                    // eslint-disable-next-line max-len
                    that.items(constants.types.PORTFOLIO_FIELDS).lastRefreshDate = userFormatters.timezoneSensitiveDateTimeFormatter.unserialize(response.data.lastRefreshDate);

                    that.add(constants.types.PROJECTS, that.getDefaultProjectSummaryFields(), null,
                        response.meta[constants.meta.DATE_COLUMNS][constants.meta.CO_PROJECT]);
                    that.add(constants.types.BUDGET_APPROVED_PROJECTS, that.getDefaultProjectSummaryFields(), null,
                        response.meta[constants.meta.DATE_COLUMNS][constants.meta.CO_PROJECT]);
                    that.add(constants.types.RESOURCE_APPROVED_PROJECTS, that.getDefaultProjectSummaryFields(), null,
                        response.meta[constants.meta.DATE_COLUMNS][constants.meta.CO_PROJECT]);
                    if (restrictedProjectsExist) {
                        that.add(constants.types.PROJECTS, {
                            name : localizer.getFormattedString('label.bp_restricted_row', response.data[constants.types.RESTRICTED_PROJECTS]),
                            id : constants.types.RESTRICTED_PROJECTS,
                            status : '-',
                            code : '',
                            strgyPriorityNum : 1,
                            riskLevel : '-'
                        },
                        null, that.projectDateFields);
                    }
                    that.add(constants.types.PORTFOLIOID, response.data[constants.types.PORTFOLIOID]);
                    that.add(constants.types.LASTCALCULATEDDATE, response.data[constants.types.LASTCALCULATEDDATE]);
                    if (!_.isEmpty(portfolioData)) {
                        portfolioData = _.union(portfolioData, [{
                            id : constants.types.PORTFOLIO_SUMMARY,
                            name : localizer.getString('label.portfolio_summary_aggregate_row'),
                            workspaceName : ''
                        }]);
                    }
                    var dateField = dateFields(_.assign({}, response.meta.columns[constants.meta.PORTFOLIOS],
                        response.meta.columns[constants.meta.CP_CAPITAL_PLAN]));
                    that.setDateFields(constants.types.PORTFOLIO, dateField);
                    that.addAll(constants.types.PORTFOLIO, portfolioData, function (type, portfolio) {
                        portfolio.id = portfolio.id.toString();
                        if (portfolio.kpis) {
                            _.forEach(portfolio.kpis.CAPITAL_PLAN, function (kpis) {
                                var columnId = kpis.columnId;
                                if (columnId) {
                                    var fieldName = that.getPortfolioColumnDefinition(columnId).fieldName;
                                    if (!_.includes(that.portfolioKpi, fieldName)) {
                                        that.portfolioKpi.push(fieldName);
                                    }
                                }
                            });
                        }
                        portfolio = _.assign(portfolio, portfolio.portfolioScorecardDetails);
                        if (portfolio.portfolioScorecardDetails && portfolio.portfolioScorecardDetails.funds) {
                            var fundsData = _.omit(portfolio.portfolioScorecardDetails.funds, 'id');
                            portfolio = _.merge(portfolio, fundsData);
                        }
                        delete portfolio.portfolioScorecardDetails;
                    });
                    if (restrictedPortfoliosExist) {
                        that.add(constants.types.PORTFOLIO, {
                            name : localizer.getFormattedString('label.bp_restricted_portfolio_row', response.data[constants.types.RESTRICTED_PORTFOLIO_COUNT]),
                            id : constants.types.RESTRICTED_PORTFOLIO_COUNT,
                            workspaceName : ''
                        });
                    }
                    that.isProjectsLoaded = true;
                    var view = that.views.getCurrentViewData();
                    if (view && view.showFilter === constants.projectFilterTypes.BUDGET_APPROVED) {
                        that.projectFilter = constants.projectFilterTypes.BUDGET_APPROVED;
                        that.updateProjectList().done(function () {
                            that.isBudgetApprovedProjectsLoaded = true;
                            dfd.resolve();
                        }).fail(dfd.reject);
                    } else if (view && view.showFilter === constants.projectFilterTypes.RESOURCE_APPROVED) {
                        that.projectFilter = constants.projectFilterTypes.RESOURCE_APPROVED;
                        that.updateProjectList().done(function () {
                            that.isResourceApprovedProjectsLoaded = true;
                            dfd.resolve();
                        }).fail(dfd.reject);
                    } else {
                        dfd.resolve();
                    }
                }).fail(dfd.reject);
            return dfd.promise();
        },
        fetchProjectSnapshots : function (project) {
            var that = this,
                dfd = $.Deferred(),
                projectId = project.id, timezoneFormatter = userFormatters.timezoneSensitiveDateTimeFormatter;
            if (!_.has(that.projectSnapshots, projectId)) {
                that.currentSnapshotItem(project);
                $.when(that.utilities.GETWithContext(constants.routes.LOAD_PROJECT_SNAPSHOTS({ projectId : projectId }))).done(function (response) {
                    that.addAll(constants.types.PROJECT_SNAPSHOTS, response, function (type, item) {
                        item.id = _.uniqueId();
                        item.time = timezoneFormatter.unserialize(item.time);
                        item.project = that.unserialize(constants.types.PROJECT, item.project, that.projectDateFields);
                        return item;
                    });

                    that.projectSnapshots[projectId] = null;
                    dfd.resolve();
                }).fail(function (jqXHR, textStatus, errorThrown) {
                    dfd.reject.apply(dfd, arguments);
                });
            } else {
                return dfd.resolve();
            }
            return dfd.promise();
        },
        unserialize : function (type, item, dateFields) {
            this._unserialize(type, item, dateFields);
            return item;
        },
        _serialize : function (type, item) {
            if (_.includes(constants.types.PROJECT_TYPES, type)) {
                delete item._loadedDependencies;
                delete item._loadedSynchronizations;
                OWNER_CONVERTER.serialize(item);
            }
            BaseStore.prototype._serialize.apply(this, arguments);
        },
        _unserialize : function (type, item, dateFields, modifyItemFn) {
            if (_.includes(constants.types.PROJECT_TYPES, type)) {
                OWNER_CONVERTER.unserialize(item);
            }

            BaseStore.prototype._unserialize.apply(this, arguments);
        },
        _serializePortfolio : function (data) {
            //to change the request payload to match the portfolioRO expected at the back end
            if (data[constants.types.PORTFOLIO]) {
                _.forEach(data[constants.types.PORTFOLIO].modified, function (item) {
                    item[constants.keys.PORTFOLIO_ID] = item[constants.keys.PORTFOLIO_MEMBER_ID];
                    item[constants.keys.FLEX_COST] = item[constants.keys.flexCostKey];
                    item[constants.keys.FLEX_TEXT] = item[constants.keys.flexTextKey];
                    item[constants.keys.FLEX_OTHER] = item[constants.keys.flexOtherKey];
                    delete item[constants.keys.PORTFOLIO_MEMBER_ID];
                    delete item[constants.keys.flexCostKey];
                    delete item[constants.keys.flexTextKey];
                    delete item[constants.keys.flexOtherKey];
                });
            }
        },
        currentSnapshotItem : function (item) {
            // create a current snapshot for each project - used in snapshot dialog
            var snapshot = {
                id : item.id + 'snapshot',
                name : localizer.getString('label.global_current_data'),
                time : moment(),
                project : item,
                isCurrent : true
            };
            this.add(constants.types.PROJECT_SNAPSHOTS, snapshot);
        },
        getData : function (data) {
            var retData = [];
            _.forEach(data, function (obj) {
                retData.push(obj);

                _.forEach(obj.measures, function (m, key) {
                    obj[key] = m.measureValue;
                    obj[key + 'Attr'] = m;
                });

                obj = _.assign(obj, obj.categories);
            });
            return retData;
        },
        saveData : function (data) {
            var that = this;
            if (!_.isEmpty(data)) {
                that._serializePortfolio(data);
                data.projectFilter = this.projectFilter;
                return $.when(this.utilities.PUTWithContext(constants.routes.SAVE_REVIEW_FLAG({}),
                    data)).done(function (response) {
                    that.commitAll(response);
                    if (that.projectFilter === constants.projectFilterTypes.BUDGET_APPROVED) {
                        that.isProjectsLoaded = false;
                        that.isResourceApprovedProjectsLoaded = false;
                    } else if (that.projectFilter === constants.projectFilterTypes.RESOURCE_APPROVED) {
                        that.isBudgetApprovedProjectsLoaded = false;
                        that.isProjectsLoaded = false;
                    } else {
                        that.isBudgetApprovedProjectsLoaded = false;
                        that.isResourceApprovedProjectsLoaded = false;
                    }
                    that._subscribable.trigger(constants.eventNames.SUMMARIZE_PORTFOLIO_GRID, that);
                });
            }
        },
        saveView : function (viewData, onPageLeave) {
            this.projectListMultiCurrencyHelper.addMetaViewPreferences(viewData);
            this.portfolioListMultiCurrencyHelper.addMetaViewPreferences(viewData);
            var viewConfig = {
                view : JSON.stringify({
                    userView : viewData,
                    recentViewIds : this.views.getRecentViewIds(),
                    currentViewId : this.views.getCurrentViewId()
                })
            };
            return this.utilities.PUT(constants.routes.SAVE_VIEW({}), viewConfig, !onPageLeave);
        },
        saveSnapshot : function (saveSnapshotName) {
            var that = this;
            var saveObj = {
                name : saveSnapshotName
            };
            return (this.utilities.PUTWithContext(constants.routes.SAVE_SNAPSHOT({}),
                saveObj)).done(function () {
                // clear cached snapshot
                that.projectSnapshots = {};
                that.clear(constants.types.PROJECT_SNAPSHOTS);
            });
        },
        getDiscussionOptions : function (newValue) {
            newValue = newValue || this.projectFilter;
            var discussionOptions = {};
            if (newValue === constants.projectFilterTypes.BUDGET_APPROVED) {
                // mediator.type = constants.types.BUDGET_APPROVED_PROJECTS;
                discussionOptions.scope = DiscussionListener.scopeEnum.PROJECT_FINANCIAL;
                discussionOptions.contextScope = DiscussionListener.contextScopeEnum.SCENARIO;
            } else if (newValue === constants.projectFilterTypes.RESOURCE_APPROVED) {
                //mediator.type = constants.types.RESOURCE_APPROVED_PROJECTS;
                discussionOptions.scope = DiscussionListener.scopeEnum.PROJECT_RESOURCE;
                discussionOptions.contextScope = DiscussionListener.contextScopeEnum.RESOURCE_SCENARIO;
            } else {
                //mediator.type = constants.types.PROJECTS;
                discussionOptions.scope = DiscussionListener.scopeEnum.PROJECT;
                discussionOptions.contextScope = DiscussionListener.contextScopeEnum.GENERIC_PORTFOLIO;
            }
            return discussionOptions;
        },
        revisePlan : function (name, type) {
            var data = {
                name : name,
                type : type
            };
            return this.utilities.PUTWithContext(constants.routes.REVISE_PLAN({}), data);
        },
        saveSelectedMeasuresViewConfig : function (selectedMeasures) {
            this.selectedMeasures = selectedMeasures;
        },
        saveOtherSettings : function (key, value) {
            if (this.otherSettings === undefined) {
                this.otherSettings = {};
            }
            this.otherSettings[key] = value;
        },
        getPortfolioId : function () {
            return _.first(this.items(constants.types.PORTFOLIOID));
        },
        recalcMeasureData : function () {
            var portfolioIds = [this.getPortfolioId()];
            return this.utilities.POSTWithContext(constants.routes.RECALCMEASURES({}), { portfolioId : portfolioIds });
        },
        getViewSettings : function () {
            return this.otherSettings;
        },
        getCodeFields : function () {
            var fields = _.pick(this.getMetadata().columns[constants.meta.CO_CODE_TYPE_DATA], function (fieldDef, fieldName) {
                return fieldName.search(/CO_CODE_TYPE-./) > -1;
            });
            return _.keys(fields);
        },
        getPortfolioMeasures : function (portfolioId) {
            var that = this;
            return this.utilities.GET(constants.routes.PORTFOLIO_MEASURES({
                capitalPortfolioId : portfolioId
            })).done(function (response) {
                that.addAll(constants.types.PORTFOLIO_MEASURES, response);
            });
        },
        getContextInfo : function () {
            return this.context;
        },
        getMetadata : function () {
            return _.first(this.items(constants.types.META));
        },
        setFilter : function (filter) {
            if (filter != null) {
                this.filter = filter;
            } else {
                this.filter = DEFAULT_FILTER;
            }
            this._subscribable.trigger('filter-updated');
        },

        getFilter : function () {
            var that = this, colName, columns = this.getMetadata().columns;
            var allColumns = _.assign({}, columns[constants.meta.RM_DEMAND_R], columns[constants.meta.CO_PROJECT], columns[constants.meta.CO_CODE_TYPE_DATA]);
            if (this.filter) {
                _.remove(this.filter.rows, function (rowObj) {
                    colName = rowObj.field.columnName;
                    return !that.columnDefPresent(allColumns, colName);
                });
            }

            return this.filter || DEFAULT_FILTER;
        },

        columnDefPresent : function (allColumns, columnName) {
            var columnDefinition = _.find(allColumns, function (columnDefinition) {
                return columnDefinition.columnName === columnName;
            });
            return columnDefinition;
        },

        getColumnDefinition : function (columnId) {
            var columns = _.assign({}, this.getMetadata().columns[constants.meta.FN_FUND_TOTAL_COST], this.projectColumns);
            var column = _.pick(columns, function (column) {
                return column.columnId === columnId;
            });

            return {
                definition : _.values(column)[0],
                fieldName : _.keys(column)[0]
            };
        },
        getCapitalPlanColumnDefinition : function (columnId) {
            var columns = _.assign({}, this.getMetadata().columns[constants.meta.FN_FUND_TOTAL_COST], this.getMetadata().columns[constants.meta.CP_CAPITAL_PLAN]);
            var column = _.pick(columns, function (column) {
                return column.columnId === columnId;
            });

            return {
                definition : _.values(column)[0],
                fieldName : _.keys(column)[0]
            };
        },
        getPortfolioColumnDefinition : function (columnId) {
            var meta = this.getMetadata();
            var column = _.pick(_.assign({}, meta.columns[constants.meta.PORTFOLIOS],
                meta.columns[constants.meta.PORTFOLIO_SCORECARD_DETAILS], meta.columns.FN_FUND_TOTAL_COST), function (column) {
                return column.columnId === columnId;
            });

            return {
                definition : _.values(column)[0],
                fieldName : _.keys(column)[0]
            };
        },

        getProjectListMultiCurrencyHelper : function () {
            return this.projectListMultiCurrencyHelper;
        },

        getPortfolioListMultiCurrencyHelper : function () {
            return this.portfolioListMultiCurrencyHelper;
        },

        getDefaultProjectSummaryFields : function () {
            return {
                id : constants.types.PROJECT_SUMMARY,
                name : localizer.getString('label.ms_project_aggregate_row_name'),
                status : '-',
                code : '',
                strdyPriorityNum : 1,
                riskLevel : '-'
            };
        },

        saveRestrictedProjects : function (response) {
            var that = this;
            if (response[constants.types.RESTRICTED_PROJECTS] !== undefined && response[constants.types.RESTRICTED_PROJECTS] > 0) {
                that.add(constants.types.PROJECTS, {
                    name : localizer.getFormattedString('label.bp_restricted_row', response[constants.types.RESTRICTED_PROJECTS]),
                    id : constants.types.RESTRICTED_PROJECTS,
                    status : '-',
                    code : '',
                    strgyPriorityNum : 1,
                    riskLevel : '-'
                },
                null, that.projectDateFields);
            }
        },
        refreshProjectsList : function (capitalPortfolioId) {
            var that = this,
                dfd = $.Deferred();

            if (parseInt(capitalPortfolioId, 10) >= 0) {
                $.when(that.utilities.GETWithContext(constants.routes.PROJECTS_REFRESH({ capitalPortfolioId : capitalPortfolioId }))).done(function (response) {
                    var itemKeys,
                        typesToClear = [];
                    // update refresh date
                    // eslint-disable-next-line max-len
                    that.items(constants.types.PORTFOLIO_FIELDS).lastRefreshDate = userFormatters.timezoneSensitiveDateTimeFormatter.unserialize(response.lastRefreshDate);

                    // clear project list
                    if (that.isBudgetApprovedProjectsLoaded) {
                        typesToClear.push(constants.types.BUDGET_APPROVED_PROJECTS);
                        that.isBudgetApprovedProjectsLoaded = false;
                    }
                    if (that.isResourceApprovedProjectsLoaded) {
                        typesToClear.push(constants.types.RESOURCE_APPROVED_PROJECTS);
                        that.isResourceApprovedProjectsLoaded = false;
                    }
                    if (that.isProjectsLoaded) {
                        typesToClear.push(constants.types.PROJECTS);
                        that.isProjectsLoaded = false;
                    }
                    _.forEach(typesToClear, function (type) {
                        itemKeys = _.pluck(that.items(type, function (item) {
                            return (item.capitalPortfolioId === capitalPortfolioId.toString() || item.id === constants.types.RESTRICTED_PROJECTS);
                        }, true), 'id');
                        that.storeCollection.clear(type, itemKeys);
                    });
                    // Update Project List
                    $.when(that.updateProjectList()).done(function () {
                        that._subscribable.trigger(constants.eventNames.SUMMARIZE_PORTFOLIO_GRID, that);
                        dfd.resolve();
                    });
                }).fail(function (jqXHR, textStatus, errorThrown) {
                    // Pass fail arguments back to controller for error handler dialog
                    dfd.reject.apply(dfd, arguments);
                });
            } else {
                dfd.resolve();
            }

            return dfd.promise();
        },

        updateProjectList : function () {
            var that = this, type, url;
            if (this.projectFilter === constants.projectFilterTypes.BUDGET_APPROVED) {
                type = constants.types.BUDGET_APPROVED_PROJECTS;
                url = constants.routes.LOAD_BUDGET_APPROVED_PROJECTS({});
            } else if (this.projectFilter === constants.projectFilterTypes.RESOURCE_APPROVED) {
                type = constants.types.RESOURCE_APPROVED_PROJECTS;
                url = constants.routes.LOAD_RESOURCE_APPROVED_PROJECTS({});
            } else {
                type = constants.types.PROJECTS;
                url = urls.injectQuery(constants.routes.PROJECTS({}), ['meta', false]);
            }
            return this.utilities.GETWithContext(url).done(function (response) {
                var itemKeys = _.map(that.items(type, function (item) {
                    return (item.id !== constants.types.PROJECT_SUMMARY);
                }, true), 'id');
                that.storeCollection.clear(type, itemKeys);

                if (!_.includes([constants.projectFilterTypes.BUDGET_APPROVED, constants.projectFilterTypes.RESOURCE_APPROVED], that.projectFilter)) {
                    response = response.data;
                }
                var projectData = that.getData(response.projects);
                that.setDateFields(type, that.projectDateFields);

                that.addAll(type, projectData, function (type, item) {
                    var fundFields = _.omit(item.funds, 'id');
                    item = _.merge(item, fundFields);
                    _.forEach(item.projectMeasureDataMap, function (measure, key) {
                        item[key] = measure.measureValue;
                        item[key + 'Attr'] = measure;
                        that.projectMeasures.push(key);
                    });
                    return item;
                }, that.projectDateFields);
                if (response && response[constants.types.RESTRICTED_PROJECTS] !== undefined && response[constants.types.RESTRICTED_PROJECTS] > 0) {
                    that.add(type, {
                        name : localizer.getFormattedString('label.bp_restricted_row', response[constants.types.RESTRICTED_PROJECTS]),
                        id : constants.types.RESTRICTED_PROJECTS,
                        status : '-',
                        code : '',
                        strgyPriorityNum : 1,
                        riskLevel : '-'
                    }, null, that.projectDateFields);
                }
                //Refresh portfolio data
                that.refreshPortfolioData(response);
            });
        },
        refreshPortfolioData : function (response) {
            var portfolioData = this.getData(response[constants.types.PORTFOLIO]);
            if (!_.isEmpty(portfolioData)) {
                portfolioData = _.union(portfolioData, [{
                    id : constants.types.PORTFOLIO_SUMMARY,
                    name : localizer.getString('label.portfolio_summary_aggregate_row'),
                    workspaceName : ''
                }]);
            }
            this.clear(constants.types.PORTFOLIO);
            this.addAll(constants.types.PORTFOLIO, portfolioData, (type, portfolio) => {
                portfolio.id = portfolio.id.toString();
                if (portfolio.kpis) {
                    _.forEach(portfolio.kpis.CAPITAL_PLAN, (kpis) => {
                        var columnId = kpis.columnId;
                        if (columnId) {
                            var fieldName = this.getPortfolioColumnDefinition(columnId).fieldName;
                            if (!_.includes(this.portfolioKpi, fieldName)) {
                                this.portfolioKpi.push(fieldName);
                            }
                        }
                    });
                }
                portfolio = _.assign(portfolio, portfolio.portfolioScorecardDetails);
                if (portfolio.portfolioScorecardDetails && portfolio.portfolioScorecardDetails.funds) {
                    var fundsData = _.omit(portfolio.portfolioScorecardDetails.funds, 'id');
                    portfolio = _.merge(portfolio, fundsData);
                }
                delete portfolio.portfolioScorecardDetails;
            });
        }
    });

    return PortfolioPerformanceScorecardStore;
});
