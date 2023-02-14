define([
    'pageInfo',
    'primutils/utils/urls'
], function (pageInfo, urls) {
    'use strict';

    return {
        types : {
            PROJECTS : 'projects',
            BUDGET_APPROVED_PROJECTS : 'budgetApprovedProjects',
            RESOURCE_APPROVED_PROJECTS : 'resourceApprovedProjects',
            META : 'meta',
            MEASURES : 'measures',
            PROJECT_MEASURES : 'projectMeasureDataMap',
            PORTFOLIOID : 'portfolioId',
            PROJECT_SUMMARY : 'project_summary',
            RESTRICTED_PROJECTS : 'restrictedProjects',
            RESTRICTED_PORTFOLIO_COUNT : 'restrictedPortfolioCount',
            LASTCALCULATEDDATE : 'lastMeasureCalculatedDate',
            CURRENCYSYMBOL : 'currencySymbol',
            PORTFOLIO : 'portfolioMembers',
            PORTFOLIO_SUMMARY : 'portfolioSummary',
            PORTFOLIO_MEASURES : 'portfolioMeasures',
            PROJECT_SNAPSHOTS : '__project-snapshots',
            PROJECT_COMMENTS : 'project-comments',
            KPI : 'kpi',
            PORTFOLIO_FIELDS : 'portfolioFields',
            PROJECT_TYPES : ['projects', 'budgetApprovedProjects', 'resourceApprovedProjects'],
            BASE : 'base'
        },
        gridLayout : {
            flexRowset : 'portfolioPerformanceScorecardRowset',
            fixedRowset : 'portfolioPerformanceScorecardFixedRowset',
            portfolioListFixedRowset : 'portfolioListGridFixedRowset',
            flexColumnGroup : 'portfolioPerformanceScorecardFlexColumnGroup',
            fixedColumnGroup : 'portfolioPerformanceScorecardFixedColumnGroup'
        },
        routes : {
            SAVE_REVIEW_FLAG : urls.template(pageInfo.baseUrl + 'rest/cp/portfolioMonitoringScorecard'),
            LOAD_PROJECT_SNAPSHOTS : urls.template(pageInfo.baseUrl + 'rest/cp/portfolioMonitoringScorecard/projects/<%=projectId%>/snapshots'),
            SAVE_SNAPSHOT : urls.template(pageInfo.baseUrl + 'rest/cp/portfolioMonitoringScorecard/snapshots'),
            PROJECTS : urls.template(pageInfo.baseUrl + 'rest/cp/portfolioMonitoringScorecard'),
            LOAD_BUDGET_APPROVED_PROJECTS : urls.template(pageInfo.baseUrl + 'rest/cp/portfolioMonitoringScorecard/budgetApprovedProjects'),
            LOAD_RESOURCE_APPROVED_PROJECTS : urls.template(pageInfo.baseUrl + 'rest/rm/plan/resourceApprovedProjects'),
            SAVE_VIEW : urls.template(pageInfo.baseUrl + 'rest/cp/portfolioMonitoringScorecard/view'),
            RECALCMEASURES : urls.template(pageInfo.baseUrl + 'rest/cp/measure/runNow/byPortfolio'),
            MEASURE_TREND : urls.template(pageInfo.baseUrl + 'rest/cp/measure/spread/<%=measureId%>/<%=portfolioId%>/PORTFOLIO'),
            PORTFOLIO_MEASURES : urls.template(pageInfo.baseUrl + 'rest/cp/capitalPortfolioInventory/<%=capitalPortfolioId%>/measures'),
            PROJECTS_REFRESH : urls.template(pageInfo.baseUrl + 'rest/cp/portfolioMonitoringScorecard/<%=capitalPortfolioId%>/filter/refresh'),
            REVISE_PLAN : urls.template(pageInfo.baseUrl + 'rest/cp/portfolioMonitoringScorecard/revisePlan'),
            REVISE_PLAN_URL : urls.template(pageInfo.baseUrl + 'openEntityTab?openEntityType=<%=type%>&openEntityId=<%=id%>&redirectTo=<%=page%>&scenarioId=' +
                '<%=scenarioId%>&planPeriod=<%=planPeriod%>&app=<%=app%>')
        },
        meta : {
            COLUMNS : 'columns',
            FLEX : 'flex',
            FIXED : 'fixed',
            CO_PROJECT : 'CO_PROJECT',
            CO_CODE_TYPE_DATA : 'CO_CODE_TYPE_DATA',
            CP_CAPITAL_PLAN : 'CP_CAPITAL_PLAN',
            DATE_COLUMNS : 'dateColumns',
            PORTFOLIOS : 'PortfolioMemberRO',
            PORTFOLIO_SCORECARD_DETAILS : 'PortfolioScorecardDetailRO',
            PortfolioProjectRO : 'PortfolioProjectRO',
            RM_DEMAND : 'RM_DEMAND',
            RM_DEMAND_R : 'RM_DEMAND_R',
            RM_DEMAND_COST_R : 'RM_DEMAND_COST_R',
            FN_FUND_TOTAL_COST : 'FN_FUND_TOTAL_COST',
            SA_PROJ_ALIGN_SCORE : 'SA_PROJ_ALIGN_SCORE',
            PROJECT_MEASURE : 'projectMeasures',
            PROJECT_MEASURE_INVENTORY : 'projectMeasureInventory'
        },
        tables : {
            SNAPSHOT_META : 'SnapshotRO',
            CP_CAP_PLAN_PROJECT : 'CP_CAP_PLAN_PROJ',
            CP_CAPITAL_PLAN : 'CP_CAPITAL_PLAN',
            CO_CODE_TYPE_DATA : 'CO_CODE_TYPE_DATA',
            CO_PROJECT : 'CO_PROJECT'
        },
        fields : {
            NAME : 'name',
            ID : 'id',
            PERIOD_START : 'start',
            PERIOD_END : 'end',
            REVIEW : 'review',
            DEMAND : 'demandUnits',
            DEMAND_FTE : 'demandFTE',
            COMMIT_DURATION : 'commitDuration',
            COMMITTED : 'committedUnits',
            COMMITTED_FTE : 'committedFTE',
            COMMITTED_START : 'commitStartDate',
            DEMAND_COST : 'demandCost',
            COMMITTED_COST : 'committedCost',
            PROPOSED_COST : 'proposedCost',
            COMMITTED_END : 'commitEndDate',
            COMMITTED_DURATION : 'committedDuration',
            DEMAND_START : 'demandStartDate',
            DEMAND_END : 'demandEndDate',
            OWNER : 'owner',
            PARENT_ID : 'parentId',
            PLAN_START : 'planStart',
            PLAN_FINISH : 'planFinish',
            COST_PERF_INDEX : 'costPerfIndex',
            PROPOSED_END_DATE : 'proposedEndDate',
            PROPOSED_START_DATE : 'proposedStartDate',
            PRIMARY_PROGRAM : 'primaryProgram',
            FUND_PRIVILEGE_FIELDS : ['total', 'allocated', 'unallocated', 'appropriated', 'consumed', 'remaining', 'unappropriated'],
            FUNDS_FIELDS : ['total', 'allocated', 'unallocated', 'appropriated', 'consumed', 'remaining', 'unappropriated']
        },
        measureTypes : {
            COST : 'COST',
            NUMBER : 'NUMBER',
            PERCENTAGE : 'PERCENTAGE'
        },
        filters : {
            ALL : 'all',
            PAST_MONTH : 'pastMonth',
            PAST_SIX_MONTHS : 'pastSix',
            PAST_YEAR : 'pastYear'
        },
        columns : {
            projects : {
                flex : [],
                fixed : [
                    'review',
                    'name'
                ]
            },
            portfolioListDefaults : ['description', 'ownerName', 'workspaceName'],
            columnMeasures : [], // dynamically populated in ...GridConfig
            dateFields : ['dateAdded', 'dateLastModified'],
            omittedDemandColumns : ['allocationPercentage', 'period', 'sequenceNumber', 'status'],
            earnedValueFields : ['costPerfIndex', 'costVariance', 'earnedValueCost',
                'estToCompleteCost', 'estAtCompleteCost', 'plannedValueCost', 'schedPerfIndex', 'scheduleVariance'],
            projectGeneralEditableFields : ['status', 'riskLevel', 'owner']
        },
        customformatters : {
            owner : 'name',
            calendar : 'calendarName',
            currency : 'currencyName',
            EMPTY_MEASURE_FORMAT : '---'

        },
        owner_converter : {
            type : 'APPLICATION_USER',
            separator : '_'
        },
        program_converter : {
            type: 'PROGRAM',
            separator : '_'
        },
        keys : {
            ID : 'id',
            NOT_APPLICABLE : 'NA',
            flexTextKey : 'textFlexValue',
            flexCostKey : 'costFlexValue',
            flexOtherKey : 'flexValue',
            codeKey : 'codeValues',
            PORTFOLIO_MEMBER_ID : 'portfolioMemberId',
            PORTFOLIO_ID : 'portfolioId',
            FLEX_COST : 'flexCost',
            FLEX_TEXT : 'flexText',
            FLEX_OTHER : 'flexOther',
            MEASURE_PREFIX : 'MeasureID_',
            MEASURE_TYPE : 'measureType',
            DATA_TYPE : 'dataType',
            PROJECT_LIST_VIEW : 'projectList',
            PORTFOLIO_LIST_VIEW : 'portfolioList'
        },
        redirectTo : {
            PORTFOLIO_PERFORMANCE_SCORECARD : {
                _name : 'portfolio_performance_scorecard'
            }
        },
        MIN_PERIODS : 5,
        MAX_PERIODS : 50,
        sort : {
            ASCENDING : 'asc',
            DESCENDING : 'desc'
        },
        kpis : {
            PROJECT : 'PROJECT',
            PORTFOLIO_FIELDS : 'CAPITAL_PLAN',
            PROJECT_SUMMARY : 'PROJECT_SUMMARY'
        },
        projectFilterTypes : {
            REVIEW : 'REVIEW',
            ALL : 'ALL',
            BUDGET_APPROVED : 'BUDGET_APPROVED',
            RESOURCE_APPROVED : 'RESOURCE_APPROVED'
        },
        CURRENTDATA : 'Current Data',
        portfolioFlexPrefix : {
            COST : 'CP_PORTFOLIO_FC-',
            OTHER : 'CP_PORTFOLIO_FO-'
        },
        codeType : {
            CO_CODE_TYPE : 'CO_CODE_TYPE-',
            CODE : 'CODE'
        },
        scenarioType : {
            RESOURCE_PLAN : 'resourcePlan',
            CAPITAL_PLAN : 'capitalPlan'
        },
        regExpPatterns : {
            PROJECT_FLEX_PATTERN : 'CO_PROJECT_CP_UF',
            PROJECT_FLEX_PATTERN_BY_COLUMN_NAME : 'udfValues',
            FLEX_PATTERN : 'FLEX_',
            COST_FLEX_PATTERN : 'CO_PROJECT_CP_FC-FLEX',
            FLEX_PATTERN_PORTFOLIO : 'UDF_'
        },
        privileges : {
            CAN_EDIT : 'canEdit',
            CAN_VIEW_COSTS : 'canViewCosts'
        },
        eventNames : {
            SUMMARIZE_PORTFOLIO_GRID : 'summarize_portfolio_grid'
        },
        columnDefProperties : {
            GENERIC_PICKER : 'GENERIC_PICKER',
            CODE_VALUE : 'CODE_VALUE',
            JOIN : 'JOIN',
            APPLICATION_USER : 'APPLICATION_USER',
            PICKER : 'picker'
        },
        ros : {
            PROJECT_MEASURE_RO : 'ProjectMeasureInventoryRO'
        }
    };
});
