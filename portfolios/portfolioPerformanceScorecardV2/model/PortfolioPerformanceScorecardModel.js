define([
    'jquery',
    'lodash',
    'moment',
    'localizer',
    'bpc/store/Store',
    'userFormatters',
    'src/portfolios/portfolioPerformanceScorecardV2/portfolioPerformanceScorecardConstants',
    'packages/metadata/MetadataBuilder',
    'shared/multicurrency/Helper',
    'shared/fields/fieldUtil',
    'shared/fields/dateFields',
    'shared/discussion/DiscussionListener'
], function ($, _, moment, localizer, BaseStore, userFormatters, constants, MetadataBuilder, MultiCurrencyHelper, fieldUtil,
    dateFields, DiscussionListener) {
    'use strict';

    return class PortfolioPerformanceScorecardModel extends BaseStore {
        constructor (options) {
            options = _.assign({}, options, {
                flexTextKey : constants.keys.flexTextKey,
                flexCostKey : constants.keys.flexCostKey,
                flexOtherKey : constants.keys.flexOtherKey,
                codeKey : constants.keys.codeKey
            });
            options.timezoneSensitiveDateFormatter = userFormatters.timezoneSensitiveDateTimeFormatter;
            super(options);
            this.measuresPortfolioColumns = [];
            this.projectSnapshots = {};
            this.measuresProjectsColumns = [];
            this.portfolioKpi = [];
            this.projectMeasures = [];
            this.portfolioListMultiCurrencyHelper = new MultiCurrencyHelper({
                areCostFieldsModified : false,
                viewPrefix : constants.keys.PORTFOLIO_LIST_VIEW
            });
            this.projectListMultiCurrencyHelper = new MultiCurrencyHelper({
                areCostFieldsModified : false,
                viewPrefix : constants.keys.PROJECT_LIST_VIEW,
                getMCToolbar : () => $('#project-table').prev()
            });
        }

        addMetadata (meta, projectMeasureInventoryMeta) {
            const multicurrencyMeta = MultiCurrencyHelper.pickMetaFields(meta);
            this.projectListMultiCurrencyHelper.setMeta(multicurrencyMeta);
            this.portfolioListMultiCurrencyHelper.setMeta(multicurrencyMeta);
            const injectResults = fieldUtil.injectStoreMeta({
                multicurrencyHelper : this.portfolioListMultiCurrencyHelper,
                meta : meta.columns,
                store : this
            });
            this.projectListMultiCurrencyHelper.processStoreInjection(injectResults);
            this.portfolioListMultiCurrencyHelper.processStoreInjection(injectResults);
            const metadata = _.omit(meta, MultiCurrencyHelper.getMetaFields(), 'views', 'view', 'viewMeta');
            metadata.id = '1';
            meta.columns[constants.ros.PROJECT_MEASURE_RO] = projectMeasureInventoryMeta;
            this.portfolioColumns = _.assign(
                {},
                metadata.columns[constants.meta.PORTFOLIOS],
                metadata.columns[constants.meta.PORTFOLIO_SCORECARD_DETAILS],
                metadata.columns[constants.meta.FN_FUND_TOTAL_COST]
            );
            this.projectColumns = _.assign(
                {},
                metadata.columns[constants.meta.CO_PROJECT],
                metadata.columns[constants.meta.CO_CODE_TYPE_DATA],
                metadata.columns[constants.meta.RM_DEMAND_R],
                metadata.columns[constants.meta.SA_PROJ_ALIGN_SCORE],
                metadata.columns[constants.meta.RM_DEMAND_COST_R],
                metadata.columns[constants.meta.PROJECT_MEASURE]
            );
            const dateFieldColumns = dateFields(this.portfolioColumns);
            this.setDateFields(constants.types.PORTFOLIO, dateFieldColumns);
            this.projectDateFields = dateFields(this.projectColumns);
            this.setDateFields(constants.types.PROJECTS, this.projectDateFields);
            this.modifyFundColumnsMeta(metadata);
            this.saveMeasuresColumn(metadata.columns);
            this.add(constants.types.META, metadata);
            if (!this.views.isInitialized()) {
                this.initializeNamedViews(meta.views, meta.view, meta.viewMeta);
            }
        }

        /* workaround to deal with the server retaining old owner RO while the grid uses the join column with a generic picker */
        unserialize (type, item, dateFields) {
            this._unserialize(type, item, dateFields);
            return item;
        }

        // eslint-disable-next-line class-methods-use-this
        modifyFundColumnsMeta (meta) {
            const fundColumns = _.merge(meta.columns.FN_FUND_TOTAL_COST, meta.columns.CP_PROJ_FUND);
            _.forEach(fundColumns, (columnDef, dataIndex) => {
                fundColumns[dataIndex].columnLabel = localizer.getFormattedString(
                    'label.global_fund_field_label', columnDef.columnLabel);
            });
        }

        saveMeasuresColumn (columns) {
            this.measuresPortfolioColumns = _.reduce(columns[constants.meta.PORTFOLIOS],
                (measureKeys, definition, key) => {
                    if (definition.measureColumn !== undefined && definition.measureColumn === true) {
                        measureKeys.push(key);
                    }
                    return measureKeys;
                }, []);
            this.measuresProjectsColumns = _.reduce(_.assign(columns[constants.meta.PORTFOLIOS],
                columns[constants.meta.PROJECT_MEASURE]), (measureKeys, definition, key) => {
                if (definition.measureColumn !== undefined && definition.measureColumn === true) {
                    measureKeys.push(key);
                }
                return measureKeys;
            }, []);
        }

        initialLoad () {
            const dfd = $.Deferred();
            const builder = new MetadataBuilder(MetadataBuilder.constants.pages.projectInventory);
            $.when(this.utilities.GETWithContext(constants.routes.PORTFOLIOS({})), builder.loadMetadata(), this.fetchContextInfo())
                .done(([response], metaData) => {
                    this.getPortfolioMeasures(this.context.id);
                    this.addMetadata(response.meta, metaData[constants.meta.PROJECT_MEASURE_INVENTORY]);
                    const portfolioData = this.getData(response.data[constants.types.PORTFOLIO]);
                    const restrictedPortfoliosExist = !_.isUndefined(
                        response.data[constants.types.RESTRICTED_PORTFOLIO_COUNT]) &&
                        response.data[constants.types.RESTRICTED_PORTFOLIO_COUNT] > 0;
                    if (_.isEmpty(portfolioData) && !restrictedPortfoliosExist) {
                        return dfd.resolve();
                    }
                    this.addPortfolioFieldsToStore(response.data.portfolioScorecardDetails,
                        response.data.lastRefreshDate);
                    this.add(constants.types.PORTFOLIO_ID, response.data[constants.types.PORTFOLIO_ID]);
                    this.add(constants.types.LAST_CALCULATED_DATE, response.data[constants.types.LAST_CALCULATED_DATE]);
                    this.addPortfolioMembersToStore(portfolioData, restrictedPortfoliosExist,
                        response.data[constants.types.RESTRICTED_PORTFOLIO_COUNT]);
                    return dfd.resolve();
                });
            return dfd.promise();
        }

        loadProjects (id) {
            const dfd = $.Deferred();
            if (_.includes(constants.records.TOP_RECORDS, id)) {
                return dfd.resolve();
            }
            this.projectFilter = constants.projectFilterTypes.ALL;
            this.isProjectsLoaded = false;
            this.isBudgetApprovedProjectsLoaded = false;
            this.isResourceApprovedProjectsLoaded = false;
            this.utilities.GET(constants.routes.PROJECTS({ portfolioId : id })).done((response) => {
                const projectData = this.getData(response.data[constants.types.PROJECTS]);
                const restrictedProjectsExist = !_.isUndefined(
                    response.data[constants.types.RESTRICTED_PROJECTS]) &&
                    response.data[constants.types.RESTRICTED_PROJECTS] > 0;
                if (_.isEmpty(projectData) && !restrictedProjectsExist) {
                    return dfd.resolve();
                }
                this.addProjects(constants.types.PROJECTS, projectData, restrictedProjectsExist,
                    response.data[constants.types.RESTRICTED_PROJECTS]);
                this.isProjectsLoaded = true;
                this.addCodes(response.data.codes);
                return dfd.resolve();
            });
            return dfd.promise();
        }

        addProjects (projectType, projectData, restrictedProjectsExist, restrictedProjects) {
            this.clearProjects();
            const projectDateColumns = this.getMetadata()[constants.meta.DATE_COLUMNS][constants.meta.CO_PROJECT];
            this.addAll(projectType, projectData, (type, item) => {
                const fundFields = _.omit(item.funds, 'id');
                item = _.merge(item, fundFields);
                _.forEach(item.projectMeasureDataMap, (measure, key) => {
                    item[key] = measure.measureValue;
                    item[key + 'Attr'] = measure;
                    this.projectMeasures.push(key);
                });
                return item;
            }, this.projectDateFields);
            const defaultProjectSummaryFields = this.getDefaultProjectSummaryFields();
            this.add(constants.types.PROJECTS, defaultProjectSummaryFields, null, projectDateColumns);
            this.add(constants.types.BUDGET_APPROVED_PROJECTS, defaultProjectSummaryFields, null, projectDateColumns);
            this.add(constants.types.RESOURCE_APPROVED_PROJECTS, defaultProjectSummaryFields, null, projectDateColumns);
            if (restrictedProjectsExist) {
                this.addRestrictedProjects(restrictedProjects);
            }
        }

        addCodes (codeData) {
            _.forEach(codeData, (codes, id) => {
                _.forEach(codes, (code) => {
                    if (_.isUndefined(code[constants.fields.PARENT_ID])) {
                        code[constants.fields.PARENT_ID] = null;
                    }
                });
                const type = constants.codeType.CO_CODE_TYPE + id;
                this.clear(type);
                this.addAll(type, codes);
            });
        }

        fetchProjectSnapshots (project) {
            var that = this,
                dfd = $.Deferred(),
                projectId = project.id, timezoneFormatter = userFormatters.timezoneSensitiveDateTimeFormatter;
            if (!_.has(that.projectSnapshots, projectId)) {
                that.currentSnapshotItem(project);
                $.when(that.utilities.GETWithContext(constants.routes.LOAD_PROJECT_SNAPSHOTS({ projectId : projectId }))).done((response) => {
                    that.addAll(constants.types.PROJECT_SNAPSHOTS, response, (type, item) => {
                        item.id = _.uniqueId();
                        item.time = timezoneFormatter.unserialize(item.time);
                        item.project = that.unserialize(constants.types.PROJECTS, item.project, that.projectDateFields);
                        return item;
                    });

                    that.projectSnapshots[projectId] = null;
                    dfd.resolve();
                }).fail((jqXHR, textStatus, errorThrown) => {
                    dfd.reject.apply(dfd, arguments);
                });
            } else {
                return dfd.resolve();
            }
            return dfd.promise();
        }

        currentSnapshotItem (item) {
            // create a current snapshot for each project - used in snapshot dialog
            const snapshot = {
                id : item.id + 'snapshot',
                name : localizer.getString('label.global_current_data'),
                time : moment(),
                project : item,
                isCurrent : true
            };
            this.add(constants.types.PROJECT_SNAPSHOTS, snapshot);
        }

        clearProjects () {
            this.clear(constants.types.PROJECTS);
            this.clear(constants.types.BUDGET_APPROVED_PROJECTS);
            this.clear(constants.types.RESOURCE_APPROVED_PROJECTS);
        }

        addRestrictedProjects (restrictedProjects) {
            this.add(constants.types.PROJECTS, {
                name : localizer.getFormattedString('label.bp_restricted_row', restrictedProjects),
                id : constants.types.RESTRICTED_PROJECTS,
                itemType : constants.types.RESTRICTED_PROJECTS,
                status : '-',
                code : '',
                strgyPriorityNum : 1,
                riskLevel : '-'
            }, null, this.projectDateFields);
        }

        refreshPortfolioData () {
            return this.utilities.GET(constants.routes.PORTFOLIOS({})).done((response) => {
                this.clear(constants.types.PORTFOLIO);
                const portfolioData = this.getData(response.data[constants.types.PORTFOLIO]);
                this.addPortfolioMembersToStore(portfolioData, false,
                    response.data[constants.types.RESTRICTED_PORTFOLIO_COUNT]);
            });
        }

        // eslint-disable-next-line class-methods-use-this
        getDefaultProjectSummaryFields () {
            return {
                id : constants.types.PROJECT_SUMMARY,
                name : localizer.getString('label.ms_project_aggregate_row_name'),
                itemType : constants.types.PROJECT_SUMMARY,
                status : '-',
                code : '',
                strdyPriorityNum : 1,
                riskLevel : '-'
            };
        }

        // eslint-disable-next-line class-methods-use-this
        getData (data) {
            return _.map(data, (obj) => {
                _.forEach(obj.measures, (m, key) => {
                    obj[key] = m.measureValue;
                    obj[key + 'Attr'] = m;
                });
                obj = _.assign(obj, obj.categories);
                return obj;
            });
        }

        addPortfolioFieldsToStore (portfolioScorecardDetails, lastRefreshDate) {
            this.add(constants.types.PORTFOLIO_FIELDS, portfolioScorecardDetails, (type, item) => {
                item.id = '1';
                const fundFields = _.omit(item.funds, 'id');
                item = _.merge(item, fundFields);
                item.lastRefreshDate = userFormatters.timezoneSensitiveDateTimeFormatter.unserialize(lastRefreshDate);
                delete item.funds;
                return item;
            });
        }

        addPortfolioMembersToStore (portfolioData, restrictedPortfoliosExist, restrictedPortfolioCount) {
            if (!_.isEmpty(portfolioData)) {
                portfolioData = _.union(portfolioData, [{
                    id : constants.types.PORTFOLIO_SUMMARY,
                    name : localizer.getString('label.portfolio_summary_aggregate_row'),
                    workspaceName : '',
                    itemType : constants.types.PORTFOLIO_SUMMARY,
                    parentId : null
                }]);
            }

            this.addAll(constants.types.PORTFOLIO, portfolioData, (type, portfolio) => {
                portfolio.id = portfolio.id.toString();
                portfolio.parentId = this.context.id.toString();
                portfolio = _.assign(portfolio, portfolio.portfolioScorecardDetails);
                if (portfolio.kpis) {
                    _.forEach(portfolio.kpis.CAPITAL_PLAN, (kpis) => {
                        const columnId = kpis.columnId;
                        if (columnId) {
                            const fieldName = this.getPortfolioColumnDefinition(columnId).fieldName;
                            if (!_.includes(this.portfolioKpi, fieldName)) {
                                this.portfolioKpi.push(fieldName);
                            }
                        }
                    });
                }
                if (portfolio.portfolioScorecardDetails && portfolio.portfolioScorecardDetails.funds) {
                    const fundsData = _.omit(portfolio.portfolioScorecardDetails.funds, 'id');
                    portfolio = _.merge(portfolio, fundsData);
                }
                delete portfolio.portfolioScorecardDetails;
            });
            if (restrictedPortfoliosExist) {
                this.add(constants.types.PORTFOLIO, {
                    name : localizer.getFormattedString('label.bp_restricted_portfolio_row', restrictedPortfolioCount),
                    id : constants.types.RESTRICTED_PORTFOLIO_COUNT,
                    workspaceName : '',
                    itemType : constants.types.RESTRICTED_PORTFOLIO_COUNT
                });
            }
        }

        getMetadata () {
            return _.first(this.items(constants.types.META));
        }

        saveView (viewData, onPageLeave) {
            this.portfolioListMultiCurrencyHelper.addMetaViewPreferences(viewData);
            this.projectListMultiCurrencyHelper.addMetaViewPreferences(viewData);
            const viewConfig = {
                view : JSON.stringify({
                    userView : viewData,
                    recentViewIds : this.views.getRecentViewIds(),
                    currentViewId : this.views.getCurrentViewId()
                })
            };
            return this.utilities.PUT(constants.routes.SAVE_VIEW({}), viewConfig, !onPageLeave);
        }

        // eslint-disable-next-line class-methods-use-this
        _serializePortfolio (data) {
            //to change the request payload to match the portfolioRO expected at the back end
            if (data[constants.types.PORTFOLIO]) {
                _.forEach(data[constants.types.PORTFOLIO].modified, (item) => {
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
        }

        saveData (data) {
            if (!_.isEmpty(data)) {
                this._serializePortfolio(data);
                data.projectFilter = this.projectFilter;
                return $.when(this.utilities.PUTWithContext(constants.routes.SAVE_REVIEW_FLAG({}), data)
                ).done((response) => {
                    this.commitAll(response);
                    if (this.projectFilter === constants.projectFilterTypes.BUDGET_APPROVED) {
                        this.isProjectsLoaded = false;
                        this.isResourceApprovedProjectsLoaded = false;
                    } else if (this.projectFilter === constants.projectFilterTypes.RESOURCE_APPROVED) {
                        this.isProjectsLoaded = false;
                        this.isBudgetApprovedProjectsLoaded = false;
                    } else {
                        this.isBudgetApprovedProjectsLoaded = false;
                        this.isResourceApprovedProjectsLoaded = false;
                    }
                    this._subscribable.trigger(constants.eventNames.SUMMARIZE_PORTFOLIO_GRID, this);
                });
            }
        }

        getPortfolioMeasures (portfolioId) {
            return this.utilities.GET(constants.routes.PORTFOLIO_MEASURES({
                capitalPortfolioId : portfolioId
            })).done((response) => {
                this.addAll(constants.types.PORTFOLIO_MEASURES, response);
            });
        }

        getFilter () {
            let colName;
            const columns = this.getMetadata().columns;
            const allColumns = _.assign(
                {},
                columns[constants.meta.RM_DEMAND_R],
                columns[constants.meta.CO_PROJECT],
                columns[constants.meta.CO_CODE_TYPE_DATA]);
            if (this.filter) {
                _.remove(this.filter.rows, (rowObj) => {
                    colName = rowObj.field.columnName;
                    return !this.columnDefPresent(allColumns, colName);
                });
            }

            return this.filter || constants.filter.DEFAULT_FILTER;
        }

        getColumnDefinition (columnId) {
            const columns = _.assign({}, this.getMetadata().columns[constants.meta.FN_FUND_TOTAL_COST], this.projectColumns);
            const column = _.pick(columns, (column) => (column.columnId === columnId));

            return {
                definition : _.values(column)[0],
                fieldName : _.keys(column)[0]
            };
        }

        // eslint-disable-next-line class-methods-use-this
        columnDefPresent (allColumns, columnName) {
            return _.find(allColumns, (columnDefinition) => columnDefinition.columnName === columnName);
        }

        setFilter (filter) {
            if (filter != null) {
                this.filter = filter;
            } else {
                this.filter = constants.filter.DEFAULT_FILTER;
            }
            this._subscribable.trigger('filter-updated');
        }

        getPortfolioColumnDefinition (columnId) {
            const column = _.pick(this.portfolioColumns, (column) => (column.columnId === columnId));
            return {
                definition : _.values(column)[0],
                fieldName : _.keys(column)[0]
            };
        }

        getDiscussionOptions (newValue) {
            const value = newValue || this.projectFilter;
            const discussionOptions = {};
            if (value === constants.projectFilterTypes.BUDGET_APPROVED) {
                discussionOptions.scope = DiscussionListener.scopeEnum.PROJECT_FINANCIAL;
                discussionOptions.contextScope = DiscussionListener.contextScopeEnum.SCENARIO;
            } else if (value === constants.projectFilterTypes.RESOURCE_APPROVED) {
                discussionOptions.scope = DiscussionListener.scopeEnum.PROJECT_RESOURCE;
                discussionOptions.contextScope = DiscussionListener.contextScopeEnum.RESOURCE_SCENARIO;
            } else {
                discussionOptions.scope = DiscussionListener.scopeEnum.PROJECT;
                discussionOptions.contextScope = DiscussionListener.contextScopeEnum.GENERIC_PORTFOLIO;
            }
            return discussionOptions;
        }

        getCodeFields () {
            return _.reduce(this.getMetadata().columns[constants.meta.CO_CODE_TYPE_DATA],
                (codeFields, fieldDef, fieldName) => {
                    if (fieldName.search(constants.codeType.CO_CODE_TYPE) > -1) { codeFields.push(fieldName); }
                    return codeFields;
                }, []);
        }

        getPortfolioListMultiCurrencyHelper () {
            return this.portfolioListMultiCurrencyHelper;
        }

        getProjectListMultiCurrencyHelper () {
            return this.projectListMultiCurrencyHelper;
        }
    };
});
