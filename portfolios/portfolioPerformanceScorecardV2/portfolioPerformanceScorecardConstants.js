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
            PROJECT_SUMMARY : 'project_summary',
            PROJECT_MEASURES : 'projectMeasureDataMap',
            META : 'meta',
            PORTFOLIO_ID : 'portfolioId',
            KPI : 'kpi',
            RESTRICTED_PORTFOLIO_COUNT : 'restrictedPortfolioCount',
            RESTRICTED_PROJECTS : 'restrictedProjects',
            PORTFOLIO_FIELDS : 'portfolioFields',
            PORTFOLIO : 'portfolioMembers',
            PORTFOLIO_SUMMARY : 'portfolioSummary',
            PROJECT_SNAPSHOTS : '__project-snapshots',
            PORTFOLIO_MEASURES : 'portfolioMeasures',
            LAST_CALCULATED_DATE : 'lastMeasureCalculatedDate',
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
            SAVE_VIEW : urls.template(pageInfo.baseUrl + 'rest/cp/portfolioMonitoringScorecard/view'),
            SAVE_REVIEW_FLAG : urls.template(pageInfo.baseUrl + 'rest/cp/portfolioMonitoringScorecard'),
            LOAD_PROJECT_SNAPSHOTS : urls.template(pageInfo.baseUrl + 'rest/cp/portfolioMonitoringScorecard/projects/<%=projectId%>/snapshots'),
            PROJECTS : urls.template(pageInfo.baseUrl + 'rest/cp/portfolioMonitoringScorecard'),
            PORTFOLIOS : urls.template(pageInfo.baseUrl + 'rest/cp/portfolioMonitoringScorecard'),
            PORTFOLIO_MEASURES : urls.template(pageInfo.baseUrl + 'rest/cp/capitalPortfolioInventory/<%=capitalPortfolioId%>/measures')
        },
        meta : {
            COLUMNS : 'columns',
            FIXED : 'fixed',
            CO_PROJECT : 'CO_PROJECT',
            CO_CODE_TYPE_DATA : 'CO_CODE_TYPE_DATA',
            RM_DEMAND_R : 'RM_DEMAND_R',
            SA_PROJ_ALIGN_SCORE : 'SA_PROJ_ALIGN_SCORE',
            RM_DEMAND_COST_R : 'RM_DEMAND_COST_R',
            PortfolioProjectRO : 'PortfolioProjectRO',
            PROJECT_MEASURE : 'projectMeasures',
            DATE_COLUMNS : 'dateColumns',
            CP_CAPITAL_PLAN : 'CP_CAPITAL_PLAN',
            FN_FUND_TOTAL_COST : 'FN_FUND_TOTAL_COST',
            PORTFOLIOS : 'PortfolioMemberRO',
            PORTFOLIO_SCORECARD_DETAILS : 'PortfolioScorecardDetailRO',
            PROJECT_MEASURE_INVENTORY : 'projectMeasureInventory'
        },
        tables:{
            SNAPSHOT_META : 'SnapshotRO'
        },
        keys : {
            NOT_APPLICABLE : 'NA',
            flexTextKey : 'textFlexValue',
            flexCostKey : 'costFlexValue',
            flexOtherKey : 'flexValue',
            codeKey : 'codeValues',
            PORTFOLIO_ID : 'portfolioId',
            FLEX_COST : 'flexCost',
            FLEX_TEXT : 'flexText',
            FLEX_OTHER : 'flexOther',
            PORTFOLIO_MEMBER_ID : 'portfolioMemberId',
            PORTFOLIO_LIST_VIEW : 'portfolioList'
        },
        columns : {
            projects : {
                flex : [],
                fixed : [
                    'review',
                    'name'
                ]
            },
            earnedValueFields : ['costPerfIndex', 'costVariance', 'earnedValueCost',
                'estToCompleteCost', 'estAtCompleteCost', 'plannedValueCost', 'schedPerfIndex', 'scheduleVariance'],
            portfolioListDefaults : ['description', 'ownerName', 'workspaceName'],
            dateFields : ['dateAdded', 'dateLastModified']
        },
        records : {
            TOP_RECORDS : ['portfolioSummary', 'restrictedPortfolioCount']
        },
        regExpPatterns : {
            FLEX_PATTERN : 'FLEX_',
            FLEX_PATTERN_PORTFOLIO : 'UDF_',
            codeKey : 'codeValues.'
        },
        fields : {
            NAME : 'name',
            ID : 'id',
            OWNER : 'owner',
            COMMIT_DURATION : 'commitDuration',
            REVIEW : 'review',
            PARENT_ID : 'parentId',
            PRIMARY_PROGRAM : 'primaryProgram',
            FUND_PRIVILEGE_FIELDS : ['total', 'allocated', 'unallocated', 'appropriated', 'consumed', 'remaining', 'unappropriated'],
            FUNDS_FIELDS : ['total', 'allocated', 'unallocated', 'appropriated', 'consumed', 'remaining', 'unappropriated']
        },
        filter : {
            DEFAULT_FILTER : {
                match : 'ALL',
                rows : []
            },
            ALL : 'all',
            PAST_MONTH : 'pastMonth',
            PAST_SIX_MONTHS : 'pastSix',
            PAST_YEAR : 'pastYear'
        },
        codeType : {
            CO_CODE_TYPE: 'CO_CODE_TYPE-',
            CODE : 'CODE'
        },
        columnDefProperties : {
            GENERIC_PICKER: 'GENERIC_PICKER',
            CODE_VALUE : 'CODE_VALUE',
            PICKER : 'picker',
            JOIN : 'JOIN',
            APPLICATION_USER : 'APPLICATION_USER'
        },
        projectFilterTypes : {
            REVIEW : 'REVIEW',
            ALL : 'ALL',
            BUDGET_APPROVED : 'BUDGET_APPROVED',
            RESOURCE_APPROVED : 'RESOURCE_APPROVED'
        },
        eventNames : {
            SUMMARIZE_PORTFOLIO_GRID : 'summarize_portfolio_grid'
        },
        privileges : {
            CAN_EDIT: 'canEdit',
            CAN_VIEW_COSTS : 'canViewCosts'
        },
        customformatters : {
            EMPTY_MEASURE_FORMAT : '---'
        },
        ros : {
            PROJECT_MEASURE_RO : 'ProjectMeasureInventoryRO'
        }
    };
});
