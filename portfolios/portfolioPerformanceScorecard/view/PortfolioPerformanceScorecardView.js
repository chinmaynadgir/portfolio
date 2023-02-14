define([
    'jquery',
    'lodash',
    'oui',
    'moment',
    'pageInfo',
    'bpc/page/basic/BasicView',
    'bpc/page/singleGrid/GridViewMixin',
    'hbr!src/portfolios/portfolioPerformanceScorecard/view/templates/page.hbs',
    'hbr!src/portfolios/portfolioPerformanceScorecard/view/templates/toolbar.hbs',
    'hbr!src/portfolios/portfolioPerformanceScorecard/view/templates/measure.hbs',
    'src/portfolios/portfolioPerformanceScorecard/portfolioPerformanceScorecardConstants',
    'shared/dialogs/simpleColumnsDialog',
    'src/portfolios/portfolioPerformanceScorecard/controller/MeasureSettingsController',
    'src/portfolios/portfolioPerformanceScorecard/controller/SparklineSettingsController',
    'userFormatters',
    'localizer',
    'primutils/ui/dialogs/AJAXErrorHandler',
    'primutils/ui/dialogs/PromptDialog',
    'shared/discussion/DiscussionListener',
    'shared/discussion/helpers/discussionAnchor',
    'shared/simpleShare/shareUtility',
    'hbr!src/portfolios/portfolioPerformanceScorecard/view/templates/pageSummary.hbs',
    'primutils/ui/dialogs/AlertDialog',
    'src/forms/formEnums',
    'hbr!src/portfolios/portfolioPerformanceScorecard/view/templates/emptyStateTemplate.hbs',
    'shared/indicatorUtils',
    'shared/dockControlledSplitter',
    'src/portfolios/portfolioPerformanceScorecard/view/ProjectListView',
    'src/portfolios/portfolioPerformanceScorecard/view/PortfolioListView',
    'src/portfolios/measureTimePhasedModal/measureTimePhasedModal',
    'primutils/utils/ajax',
    'primutils/utils/urls',
    'hbr!src/portfolios/portfolioPerformanceScorecard/view/templates/tooltip.hbs',
    'hbr!src/portfolios/portfolioPerformanceScorecard/view/templates/changeBar.hbs',
    'primutils/utils/keyCode',
    'shared/logicalDataTypeConstants',
    'shared/fields/valueIndicatorComparator',
    'primutils/ui/dialogs/ConfirmDialog',
    'shared/runReports/runReports',
    'src/portfolios/shared/portfolioUtils',
    'ojs/ojchart'
], function ($, _, oui, moment, pageInfo, BasicView, GridViewMixin, pageTemplate, toolbarTemplate, measureTemplate, constants, SimpleColumnsDialog,
        MeasureSettingsController, SparklineSettingsController, userFormatters, localizer, AJAXErrorHandler, PromptDialog, DiscussionListener,
        discussionAnchorHelper, ShareUtility, pageSummaryTemplate, AlertDialog, formEnums, emptyState, indicatorUtils, DockControlledSplitter, ProjectListView,
        PortfolioListView, measureTimePhasedModal, ajax, urls, tooltip, changeBarTemplate, keyCode, logicalDataTypeConstants, valueIndicatorComparator,
        ConfirmDialog, RunReports, PortfolioUtils) {
    'use strict';

    var dateFormatter = userFormatters.timezoneSensitiveDateTimeFormatter, DEFAULT_OPTIONS = {
        color : '#267db3',
        highColor : '#006400',
        lowColor : '#8b0000',
        markerShape : 'circle',
        markerSize : 3,
        enableSparklines : true,
        sparklinePeriods : 10,
        highlightHighLowValue : true
    };

    function PortfolioPerformanceScorecardView (controller, model, options) {
        BasicView.apply(this, arguments);
        this._projectListView = new ProjectListView(this, this._controller, this._controller._model, {}, constants.keys.PROJECT_LIST_VIEW);
        this._portfolioListView = new PortfolioListView(this, this._controller, this._controller._model, {}, constants.keys.PORTFOLIO_LIST_VIEW);
        this._controller.getStore().on('program-fetch-failed', PortfolioUtils.showWarningBanner.bind(this));
    }

    PortfolioPerformanceScorecardView.prototype = _.assign(Object.create(BasicView.prototype), {
        constructor : PortfolioPerformanceScorecardView,

        getPageTemplate : function () {
            return pageTemplate;
        },

        getToolbarTemplate : function () {
            return toolbarTemplate;
        },

        _getRootViewPreferences : function () {
            return BasicView.prototype._getViewPreferences.apply(this, arguments);
        },

        _getPageSummaryElement : function () {
            return this.attachElementsToPage();
        },

        attachElementsToPage : function () {
            var summaryElements = [];
            summaryElements.push(RunReports.renderAndAttach(function () {
                var pageDetails = {};
                pageDetails.id = parseInt(pageInfo.context.id, 10);
                pageDetails.type = 'PORTFOLIOPERF';
                return pageDetails;
            }));
            var $elems = $(pageSummaryTemplate());
            this.$discussionBtn = $elems.filter(discussionAnchorHelper.discussionButton.selector);
            summaryElements.push($elems);
            return summaryElements;
        },

        _loaded : function () {
            var store = this._controller.getStore();
            this.initDiscussionAndShareUtility();
            if (_.isEmpty(store.items(constants.types.PROJECTS)) && _.isEmpty(store.items(constants.types.PORTFOLIO))) {
                // We neither have projects nor portfolios. Add empty state to panel.
                this._$el.parent().addClass('empty-state-parent').append(emptyState());
                return;
            }
            BasicView.prototype._loaded.apply(this, arguments);
        },

        _initListeners : function () {
            BasicView.prototype._initListeners.apply(this, arguments);
            var that = this;

            this._projectListView._initListeners();
            this._portfolioListView._initListeners();

            this.$projectToggleBtn.on('click', function () {
                that._projectListView.showGrid();
                that._portfolioListView.hideGrid();
                that.showCurrencyBanner('project');
            });

            this.$portfolioToggleBtn.on('click', function () {
                that._projectListView.hideGrid();
                that._portfolioListView.showGrid();
                that.showCurrencyBanner('portfolio');
            });

            this.filterCombobox.on('selection-change', function (event) {
                var store = that._controller.getStore();
                store.projectFilter = event.key;
                that._controller.getStore()._trigger('synchronize-view-data');
                that.updateComboBox(event.key);
            });

            this.filterCombobox.on('pre-change', function (newValue, oldValue) {
                return that.changeProjectSelection(newValue, oldValue);
            });

            this.$saveSnapshotBtn.on('click', function () {
                new PromptDialog({
                    title : localizer.getString('label.global_save_snapshot'),
                    message : localizer.getString('label.global_name'),
                    acceptLabel : localizer.getString('label.global_save'),
                    cancelLabel : localizer.getString('label.global_cancel'),
                    defaultText : '',
                    required : true,
                    okCallback : function (value) {
                        // post accept message
                        that._controller._model.saveSnapshot(value)
                            .fail(AJAXErrorHandler.callbackForTaskKey('message.cp_error_save_snapshot'));
                    },
                    checkUnique : function (snapshotName) {
                        if (snapshotName.trim().length === 0) {
                            return {
                                result : true,
                                message : localizer.getFormattedString('message.validation_required',
                                    localizer.getString('label.global_name'))
                            };
                        }
                    }
                });
            });

            this.$revisePlanBtn.on('click', function (event) {
                new PromptDialog({
                    title : localizer.getString('label.ms_dialog_revise_plan_title'),
                    directions : localizer.getString('message.ms_confirm_go_to_budget_planning'),
                    message : localizer.getString('label.ms_dialog_revise_scenario_name'),
                    acceptLabel : localizer.getString('label.ms_dialog_go_to_budget_planning'),
                    cancelLabel : localizer.getString('label.global_cancel'),
                    required : true,
                    okCallback : function (name) {
                        that._controller._model.revisePlan(name, constants.scenarioType.CAPITAL_PLAN).done(function (scenario) {
                            window.location = constants.routes.REVISE_PLAN_URL({
                                type : that._controller._model.context.contextType,
                                id : that._controller._model.context.id,
                                page : 'BUDGET_PLANNING',
                                app : 'COST_MANAGEMENT',
                                scenarioId : scenario.id,
                                planPeriod : that._controller._model.context.planPeriod
                            });
                        }).fail(AJAXErrorHandler.callbackForTaskKey('message.generic_failed_to_save'));
                    },
                    checkUnique : function (name) {
                        if (name.trim().length === 0) {
                            return {
                                result : true,
                                message : localizer.getFormattedString('message.validation_required',
                                    localizer.getString('label.global_name'))
                            };
                        }
                    }
                });
            });

            this.$reviseRsrcPlanBtn.on('click', function (event) {
                new PromptDialog({
                    title : localizer.getString('label.ms_dialog_revise_plan_title'),
                    directions : localizer.getString('message.ms_confirm_go_to_resource_planning'),
                    message : localizer.getString('label.ms_dialog_revise_rsrc_scenario_name'),
                    acceptLabel : localizer.getString('label.ms_dialog_go_to_resource_planning'),
                    cancelLabel : localizer.getString('label.global_cancel'),
                    required : true,
                    okCallback : function (name) {
                        that._controller._model.revisePlan(name, constants.scenarioType.RESOURCE_PLAN).done(function (scenario) {
                            window.location = constants.routes.REVISE_PLAN_URL({
                                type : that._controller._model.context.contextType,
                                id : that._controller._model.context.id,
                                page : 'RESOURCE_PLANNING_SCENARIOS',
                                app : 'RESOURCE_MANAGEMENT',
                                scenarioId : scenario.id,
                                planPeriod : that._controller._model.context.planPeriod
                            });
                        }).fail(AJAXErrorHandler.callbackForTaskKey('message.generic_failed_to_save'));
                    },
                    checkUnique : function (name) {
                        if (name.trim().length === 0) {
                            return {
                                result : true,
                                message : localizer.getFormattedString('message.validation_required',
                                    localizer.getString('label.global_name'))
                            };
                        }
                    }
                });
            });
        },

        changeProjectSelection : function (newValue, oldValue) {
            var that = this, store = this._controller._model, type = this._projectListView._mediator.type;
            if ((newValue[0] === constants.projectFilterTypes.BUDGET_APPROVED || oldValue[0] === constants.projectFilterTypes.BUDGET_APPROVED ||
                newValue[0] === constants.projectFilterTypes.RESOURCE_APPROVED || oldValue[0] === constants.projectFilterTypes.RESOURCE_APPROVED) &&
                store.isDirty(type)) {
                new ConfirmDialog({
                    message : localizer.getString('message.portfolio_change_project_filter_selection'),
                    okCallback : function () {
                        store.reset(constants.types.BUDGET_APPROVED_PROJECTS);
                        store.reset(constants.types.RESOURCE_APPROVED_PROJECTS);
                        store.reset(constants.types.PROJECTS);
                    },
                    cancelCallback : function () {
                        that.updateComboBox(oldValue[0]);
                        store._trigger('synchronize-view-data');
                    }
                });
            }
        },

        openMeasureValueModal : function (args) {
            var that = this, baseStore = this._controller.getStore();
            var meta = this._controller.getMetadata().columns.PortfolioMeasureDataRO;
            measureTimePhasedModal.start($(document.body), {
                viewOptions : {
                    metadata : meta,
                    titles : {
                        measure : args.measureName,
                        measureable : args.capitalPortfolioName
                    },
                    canEdit : args.canEdit,
                    measureModalReadOnly :args.measureModalReadOnly
                },
                modelOptions : {
                    measureId : args.measureId,
                    objectId : args.capitalPortfolioId,
                    record : args.portfolioMeasure,
                    objectType : 'PORTFOLIO'
                },
                controllerOptions : {
                    type : constants.types.MEASURES,
                    baseStore : baseStore,
                    updateFn : baseStore.isMemberPortfolioMeasure ? that.memberPortfolioUpdateFn.bind(that) :
                        _.partial(that.measureTimePhasedModalUpdateFn, _, args.element).bind(that)
                }
            });
        },

        memberPortfolioUpdateFn : function (options) {
            var store = options.baseStore;
            store.update(constants.types.PORTFOLIO, options.record.portfolioId, constants.keys.MEASURE_PREFIX + options.record.measureId,
                options.actualExpressionValue, true);
        },

        measureTimePhasedModalUpdateFn : function (options, $measure) {
            var store = options.baseStore, color = _.isString(options.statusIndicatorColor) ?
                options.statusIndicatorColor.replace('#', '') : options.statusIndicatorColor;
            store.update(constants.types.MEASURES, options.record.measureId, 'value', options.actualExpressionValue, true);
            if (options.currentPeriodModified) {
                store.update(constants.types.MEASURES, options.record.measureId, 'statusIndicatorColor', color, true);
                store.update(constants.types.MEASURES, options.record.measureId, 'statusIndicatorIcon', options.statusIndicatorIcon, true);
            }
            $measure.remove();
            this.showMeasureTiles({
                measure : [_.cloneDeep(store.item(constants.types.MEASURES, options.record.measureId))]
            });
            this.changeMeasureView(this._controller.getMeasureViewSettings());
        },

        initDiscussionAndShareUtility : function (options) {
            //page level discussion
            var that = this;
            var discussion = new DiscussionListener(this.$discussionBtn, {
                scope : DiscussionListener.scopeEnum.GENERIC_PORTFOLIO
            });
            var portfolioName = this._controller._model.context.name,
                portfolioId = this._controller._model.context.id;
            discussion.registerTopicId(portfolioId, portfolioName);
            discussion.listen();

            //page level share

            $('#simple-share').on('click', function () {
                var pageDetails = {};
                pageDetails.id = parseInt(that._controller._model.context.id, 10);
                pageDetails.type = 'MONITOR_SCORECARD';
                ShareUtility.showShareDialog(pageDetails);
            });
            ShareUtility.showShareIcon();
            RunReports.showIcon();
        },

        _initComponents : function () {
            var filterValues = [],
                context = this._controller._model.context,
                privileges = context.privileges;
            BasicView.prototype._initComponents.apply(this, arguments);
            filterValues.push(
                {
                    key : 'ALL',
                    value : 'ALL',
                    display : localizer.getString('label.global_all')
                },
                {
                    key : 'REVIEW',
                    value : 'REVIEW',
                    display : localizer.getString('label.global_review')
                },
                {
                    key : 'BUDGET_APPROVED',
                    value : 'BUDGET_APPROVED',
                    display : localizer.getString('label.portfolio_budget_approved_projects')
                },
                {
                    key : 'RESOURCE_APPROVED',
                    value : 'RESOURCE_APPROVED',
                    display : localizer.getString('label.portfolio_resource_approved_projects')
                }
            );
            this._controller.setViewOptionsToStore();
            this.showMeasureTiles(this._controller.getMeasures(), this);
            this.showPortfolioFields(this._controller.getPortfolioFields());
            this.initCombo();
            var defaultView = this._controller.getMeasureViewSettings();
            this.$actionButton = this._$el.find('#integration-btn-group');
            this.$saveSnapshotBtn = this._$el.find('#save-snapshot-btn');
            this.$revisePlanBtn = this._$el.find('#revise-plan-btn');
            this.$reviseRsrcPlanBtn = this._$el.find('#revise-rsrc-plan-btn');
            this.$measureRefreshBtn = this._$el.find('#measure-refresh');
            this.$measureRefreshIcon = this._$el.find('#measure-refresh-icon');
            this._toggleToolbarElement(this.$actionButton, (privileges.canAddScenarios || privileges.canAddSnapshots || privileges.canAddResourceScenarios));
            this._toggleToolbarElement(this.$saveSnapshotBtn, privileges.canAddSnapshots);
            this._toggleToolbarElement(this.$revisePlanBtn, privileges.canAddScenarios);
            this._toggleToolbarElement(this.$reviseRsrcPlanBtn, privileges.canAddResourceScenarios);
            this.$actionButton.toggleClass('hidden', !(context.hasCurrentApprovedBudgetPlan || context.hasCurrentApprovedResourcePlan));
            if (!context.hasCurrentApprovedBudgetPlan) {
                this.$saveSnapshotBtn.hide();
                this.$revisePlanBtn.hide();
            }
            if (!context.hasCurrentApprovedResourcePlan) {
                this.$reviseRsrcPlanBtn.hide();
            }
            this.measureView.value({ value : defaultView });
            this.changeMeasureView(defaultView);
            this.updateLastCalculatedDate();
            this.$toggleBtn = this._$el.find('#project-portfolio-toggle');
            this.$projectToggleBtn = this.$toggleBtn.find('.project');
            this.$portfolioToggleBtn = this.$toggleBtn.find('.portfolio');
            this._initSplitter();
            this._projectListView._initComponents();
            this._controller.getType = function () {
                return constants.types.PORTFOLIO;
            };
            this.filterCombobox = new oui.ComboBox({ keyboardInput : false }, this._$el.find('#scorecard-filter-select'), filterValues).init();
            this._portfolioListView._initComponents();
            this._initAllToolbars();
            this.updateGrid(defaultView);
            this.verifyProgramService();
        },

        verifyProgramService : function () {
            var store = this._controller.getStore();
            var programMSAvailable = store.getMetadata().programMSStatus;
            if (!programMSAvailable) {
                var primaryProgram = this._projectListView._getViewConfig().named.columns[constants.fields.PRIMARY_PROGRAM];
                if (primaryProgram && primaryProgram.visible) {
                    this.setProgramMsDownBanner();
                }
            }
        },

        _initAllToolbars : function () {
            var projectCount,
                portfolioCount,
                $projectBtn,
                $portfolioBtn,
                toggle;

            projectCount = this._controller._model.count(constants.types.PROJECTS);
            portfolioCount = this._controller._model.count(constants.types.PORTFOLIO);

            /* There exists at least one of both, start initializing toolbars. */
            this._$toolbar.removeClass('hidden');

            $portfolioBtn = this._$el.find('.portfolio');
            $projectBtn = this._$el.find('.project');
            if (projectCount > 1 && portfolioCount > 0) { // We have both of them, toggle according to previous view preference.
                /* Both are available, enable both buttons. */
                $portfolioBtn.prop('disabled', false);
                $projectBtn.prop('disabled', false);

                toggle = this._getViewPreferences().toggle;
                if (toggle === 'portfolio') {
                    this._toggleBtnAndGrid($portfolioBtn, this._portfolioListView, this._projectListView);
                } else {
                    this._toggleBtnAndGrid($projectBtn, this._projectListView, this._portfolioListView);
                }
                return; // END OF LOGIC.
            }
            /*
             * If we have reached here it means only one of
             * both projects or portfolios is non-empty.
             *  */
            if (projectCount > 1) {
                $projectBtn.prop('disabled', false);
                this._toggleBtnAndGrid($projectBtn, this._projectListView, this._portfolioListView);
            }
            if (portfolioCount > 0) {
                $portfolioBtn.prop('disabled', false);
                this._toggleBtnAndGrid($portfolioBtn, this._portfolioListView, this._projectListView);
            }
        },

        _initToolbar : function () {
            BasicView.prototype._initToolbar.apply(this, arguments);
            this._$toolbar.find('.views-dropdown').replaceWith(this._pageAPI.getNamedViewPicker());
            $('.measure-view-select .control-label').attr('title', localizer.getString('label.global_show'));
            $('.scorecard-filter-select .control-label').attr('title', localizer.getString('label.global_show'));
        },

        _toggleBtnAndGrid : function ($btnToEnable, viewToShow, viewToHide) {
            $btnToEnable.addClass('active');
            viewToShow.showGrid();
            viewToHide.hideGrid();
        },

        _initSplitter : function () {
            this.splitPane = new DockControlledSplitter(this._$el, {
                initialSplit : 0.2
            });
        },

        initCombo : function () {
            var that = this;
            this.measureView = new oui.ComboBox({
                keyboardInput : false,
                allowEmpty : true
            }, this._$el.find('#measure-view-select')).init();
            this.measureView.on('valueSelected', function (event) {
                that.changeMeasureView(event.value);
                that.updateGrid(event.value);
                that._controller._model._trigger('synchronize-view-data');
            });
        },
        showSelectedMeasures : function (selectedMeasures) {
            var that = this, measures = that._controller.getMeasures().measure;
            if (measures === undefined) {
                return;
            }
            if (selectedMeasures === undefined) {
                selectedMeasures = [];
            }
            var blnMeasureVisible = false;
            _.forEach(measures, function (obj) {
                if (_.includes(selectedMeasures, obj.id)) {
                    that._$el.find('.measure-header-item').filter(function (index, elem) {
                        return $(elem).find('span[measure-id="' + obj.id + '"]').length > 0;
                    }).removeClass('hide');
                    blnMeasureVisible = true;
                } else {
                    that._$el.find('.measure-header-item').filter(function (index, elem) {
                        return $(elem).find('span[measure-id="' + obj.id + '"]').length > 0;
                    }).addClass('hide');
                }
            });
            if (blnMeasureVisible === true || that._controller.getPortfolioFields().length) {
                that._$el.find('.no-measure-text').hide();
            } else {
                that._$el.find('.no-measure-text').show();
            }
            that._controller.saveSelectedMeasuresViewConfig(selectedMeasures);
            that.reorderMeasures(selectedMeasures, that);
        },
        reorderMeasures : function (selectedMeasures, view) {
            var $placeHolder = view._$el.find('#measure-header-pane');
            _.forEach(selectedMeasures, function (id) {
                $placeHolder.append(view._$el.find('.measure-header-item').filter(function (index, elem) {
                    return $(elem).find('span[measure-id="' + id + '"]').length > 0;
                }));
            });
        },
        changeMeasureView : function (value) {
            var $measureValues = this._$el.find('.measure-value');
            var $measureIndicators = this._$el.find('.measure-indicator');
            var $measureHeaderItems = this._$el.find('.measure-header-item');
            switch (value) {
                case 'value':
                    $measureValues.removeClass('hide');
                    $measureIndicators.addClass('hide');
                    break;
                case 'icon':
                    $measureIndicators.removeClass('hide');
                    $measureValues.addClass('hide');
                    break;
                case 'value-icon':
                    $measureIndicators.removeClass('hide');
                    $measureValues.removeClass('hide');
                    $measureHeaderItems.each(function () {
                        $(this).find('.measure-indicator').before($(this).find('.measure-value'));
                    });
                    break;
                case 'icon-value':
                    $measureIndicators.removeClass('hide');
                    $measureValues.removeClass('hide');
                    $measureHeaderItems.each(function () {
                        $(this).find('.measure-value').before($(this).find('.measure-indicator'));
                        if ($(this).find('.pgbu-icon-indicator-').length > 0) {
                            $(this).find('.measure-indicator').addClass('hide');
                        }
                    });
                    break;
            }
            this._controller.saveOtherSettings('measureView', value);
        },
        updateGrid : function (value) {
            var that = this;
            var updatedColumnOptions = {};
            var portfolioViewConfig = this._portfolioListView._gridWidget.getViewConfig();

            _.forEach(that._portfolioListView._gridWidget.columnDefinitions, function (column, columnName) {
                if (_.includes(that._controller._model.portfolioKpi, columnName)) {
                    updatedColumnOptions[columnName] = {
                        dataDisplay : value
                    };
                }
            });

            that._portfolioListView._gridWidget._setOption('columns', updatedColumnOptions);
            that._portfolioListView._gridWidget.applyViewConfig(portfolioViewConfig);

            updatedColumnOptions = {};
            var projectViewConfig = this._projectListView._gridWidget.getViewConfig();
            _.forEach(that._projectListView._gridWidget.columnDefinitions, function (column, columnName) {
                if (_.includes(that._controller._model.kpiFields, columnName)) {
                    updatedColumnOptions[columnName] = {
                        dataDisplay : value
                    };
                }
            });

            that._projectListView._gridWidget._setOption('columns', updatedColumnOptions);
            that._projectListView._gridWidget.applyViewConfig(projectViewConfig);
        },
        getViewSettings : function () {
            var settings = _.assign({}, DEFAULT_OPTIONS, this._controller.getViewSettings());
            if (!settings.highlightHighLowValue) {
                settings.highColor = null;
                settings.lowColor = null;
                settings.markerShape = 'auto';
                settings.markerSize = null;
            }
            return settings;
        },
        getMeasures : function () {
            return _.map(this._controller.getMeasures().measure, function (measure) {
                return {
                    id : measure.id,
                    name : measure.name
                };
            });
        },
        getSelectedMeasures : function (available) {
            var selected = this._controller.getStore().selectedMeasures;

            available = _.indexBy(available, 'id');

            // remove unavailable measures
            selected = _.filter(selected, function (measureId) {
                return _.has(available, measureId);
            });

            // update measure name
            return _.map(selected, function (measureId) {
                return {
                    id : measureId,
                    name : available[measureId].name
                };
            });
        },
        settings : GridViewMixin.prototype.settings,
        _getGridSettingsConfig : function () {
            var that = this, available = that.getMeasures();
            return {
                extraTabs : {
                    measures : {
                        name : localizer.getString('label.ms_settings_measures'),
                        constructor : MeasureSettingsController,
                        available : available,
                        selected : that.getSelectedMeasures(available),
                        commit : function (saveData) {
                            that.showSelectedMeasures(_.pluck(saveData, 'id'));
                        }
                    },
                    sparkChart : {
                        name : localizer.getString('label.ms_settings_spark_lines'),
                        constructor : SparklineSettingsController,
                        data : that.getViewSettings(),
                        commit : function (saveData) {
                            that.toggleSparklines(saveData.enableSparklines);
                            that.refreshSparklines(saveData);
                        }
                    }
                }
            };
        },
        recalcMeasureData : function () {
            this._controller.recalcMeasureData();
            this._$el.find('#measure-refresh').attr('disabled', 'disabled');
            new AlertDialog({
                message : localizer.getString('message.measures_recalculate_set_in_background'),
                type : formEnums.DialogType.INFORMATION
            });
        },
        getFormattedValue : function (type, value) {
            //TODO Use _.isFinite (NOTE: This does not auto-cast to Number, so additional checks may be required)
            // eslint-disable-next-line no-restricted-globals
            if (_.isNull(value) || _.isUndefined(value) || !isFinite(value)) {
                return value;
            }
            switch (type) {
                case constants.measureTypes.NUMBER:
                    return userFormatters.genericNumberFormatter.format(value);
                case constants.measureTypes.COST:
                    return userFormatters.costFormatter.format(value);
                case constants.measureTypes.PERCENTAGE:
                    return userFormatters.percentFormatter.format(value);
                default:
                    return value;
            }
        },
        getFormattedPortfolioFieldValue : function (fieldDefinition, value) {
            var that = this;
            if (_.isNull(value) || _.isUndefined(value)) {
                return value;
            }
            switch (fieldDefinition.logicalDataType) {
                case logicalDataTypeConstants.COST:
                case logicalDataTypeConstants.FLEX_COST:
                    return userFormatters.costFormatter.format(parseFloat(value));
                case logicalDataTypeConstants.INTEGER:
                case logicalDataTypeConstants.FLEX_INTEGER:
                    return userFormatters.genericIntegerFormatter.format(parseFloat(value));
                case logicalDataTypeConstants.LONG:
                case logicalDataTypeConstants.DOUBLE:
                case logicalDataTypeConstants.FLEX_NUMBER:
                    return userFormatters.genericNumberFormatter.format(parseFloat(value));
                case logicalDataTypeConstants.PERCENT:
                    return userFormatters.percentFormatter.format(parseFloat(value));
                case logicalDataTypeConstants.ENUM:
                case logicalDataTypeConstants.FLEX_LIST:
                    return value ? _.findWhere(fieldDefinition.listValues, { key : value }).value : localizer.getString('label.ms_no_value');
                case logicalDataTypeConstants.MULTICURRENCY_COST:
                    return that._controller.getStore().getProjectListMultiCurrencyHelper().getFormatter().format(value);
                default:
                    return value;
            }
        },
        showMeasureTiles : function (measures, view) {
            var that = this, options = that.getViewSettings(), promises = [], context = this._controller.getContextInfo(),
                canViewCosts = context.privileges.canViewCosts;
            _.forEach(measures.measure, function (measure) {
                var $measure;
                if (measure.measureType === constants.measureTypes.COST && !canViewCosts) {
                    measure.canViewMeasure = false;
                    measure.canViewTrend = false;
                } else {
                    measure.value = this.getFormattedValue(measure.measureType, measure.value);
                    measure.statusIndicatorIcon = indicatorUtils.getIcon(measure.statusIndicatorIcon);
                    measure.canViewMeasure = true;
                    measure.canViewTrend = true;
                }
                $measure = $(measureTemplate(measure));
                $measure.find('.measure-locked').parent().css('text-align', 'center');
                $measure.appendTo(that._$el.find('#measure-header-pane'));
                promises.push(that.createChart(measure, $measure.find('.measure-trend'), options));
                var trendIconEventHandler = _.debounce(function () {
                    that.openMeasureValueModal({
                        capitalPortfolioId : context.id,
                        measureId : measure.id,
                        measureName : measure.name,
                        capitalPortfolioName : context.name,
                        canEdit : context.privileges.canEdit,
                        portfolioMeasure : that._controller.getPortfolioMeasure(measure.id),
                        element : $measure
                    });
                }, 500, {
                    leading : true,
                    trailing : false
                });
                $measure.find('.measure-trend-icon').on('click', trendIconEventHandler);
                $measure.find('.measure-trend-icon').on('keypress', function (event) {
                    if (event.keyCode === keyCode.SPACE) {
                        trendIconEventHandler();
                    }
                });
                function toggleTrendIcon (hide) {
                    return function () {
                        if (!hide) {
                            $('.measure-header-item.active').removeClass('active');
                        }
                        $measure.toggleClass('active', !hide);
                    };
                }
                $measure.find('#measure-tile').focus(toggleTrendIcon(false));
                $measure.hover(toggleTrendIcon(false), toggleTrendIcon(true));
            }, this);
            $.when(promises).done(function () {
                that.showSelectedMeasures(that._controller.getSelectedMeasures());
            });
            that.toggleSparklines(options.enableSparklines);
        },
        showPortfolioFields : function (portfolioFields) {
            var that = this, icons = {},
                store = that._controller.getStore(),
                capitalPlanValueIndicatorComparator = valueIndicatorComparator(portfolioFields,
                    _.bind(store.getCapitalPlanColumnDefinition, store), 'CAPITAL_PLAN', null, that._controller.getStore().getProjectListMultiCurrencyHelper()),
                portfolioDetails = store.item(constants.types.PORTFOLIO_FIELDS, '1'),
                canViewCosts = store.context.privileges.canViewCosts,
                canViewFundCosts = store.context.privileges.canViewFundCosts;
            _.forEach(portfolioDetails, function (value, key, obj) {
                if (key === constants.keys.flexCostKey) {
                    _.forEach(value, function (flexValue, flexKey) {
                        obj[constants.portfolioFlexPrefix.COST + flexKey] = obj[flexKey];
                    });
                } else if (key === constants.keys.flexOtherKey) {
                    _.forEach(value, function (flexValue, flexKey) {
                        obj[constants.portfolioFlexPrefix.OTHER + flexKey] = obj[flexKey];
                    });
                }
            });

            function setIcon (fieldName, indicator, bubbleColor) {
                if (indicator != null) {
                    icons[fieldName] = {
                        indicator : indicator,
                        color : bubbleColor
                    };
                }
            }

            _.forEach(portfolioFields, function (portfolioField) {
                var $portfolioField;
                var thresholdColumnDef = store.getCapitalPlanColumnDefinition(portfolioField.columnId);
                portfolioField.name = thresholdColumnDef.definition.columnLabel;
                if (_.includes([logicalDataTypeConstants.COST, logicalDataTypeConstants.FLEX_COST], thresholdColumnDef.definition.logicalDataType) &&
                    !canViewCosts) {
                    portfolioField.canViewMeasure = false;
                } else if (_.includes(constants.fields.FUND_PRIVILEGE_FIELDS, thresholdColumnDef.fieldName) &&
                    !canViewFundCosts) {
                    portfolioField.canViewMeasure = false;
                } else {
                    portfolioField.value = that.getFormattedPortfolioFieldValue(thresholdColumnDef.definition, portfolioDetails[thresholdColumnDef.fieldName]);
                    capitalPlanValueIndicatorComparator(_.assign({}, portfolioDetails, portfolioField), setIcon);
                    if (icons[thresholdColumnDef.fieldName]) {
                        portfolioField.statusIndicatorIcon = indicatorUtils.getIcon(icons[thresholdColumnDef.fieldName].indicator);
                        portfolioField.statusIndicatorColor = icons[thresholdColumnDef.fieldName].color;
                    }
                    portfolioField.canViewMeasure = true;
                }
                portfolioField.canViewTrend = false;
                $portfolioField = $(measureTemplate(portfolioField));
                $portfolioField.removeClass('hide');
                $portfolioField.find('.measure-trend').addClass('invisible');
                $portfolioField.find('.measure-locked').parent().css('text-align', 'center');
                $portfolioField.appendTo(that._$el.find('#measure-header-pane'));
            });
        },
        getURI : function (url, queryParams) {
            _.forEach(queryParams, function (value, name) {
                url = urls.injectQuery(url, [name, value]);
            });
            return url;
        },
        createChart : function (measure, $el, options) {
            var that = this, dfd, $chartElem;

            $chartElem = document.createElement('div');
            $chartElem.className = 'chart-container';

            $el.empty().append($chartElem);

            dfd = that.loadChartData(measure, $chartElem, {
                portfolioId : that._controller.getPortfolioId(),
                period : options.sparklinePeriods
            });

            $.when(dfd).done(function (data, items) {
                $el.find('.chart-container').ojSparkChart({
                    items : items,
                    color : options.color,
                    highColor : options.highColor,
                    lowColor : options.lowColor,
                    markerShape : options.markerShape,
                    markerSize : options.markerSize,
                    tooltip : {
                        renderer : _.partial(that.createTooltip.bind(that), measure, data, items)
                    }
                });
            });

            return dfd;
        },
        createTooltip : function (measure, data, items) {
            var periods = this.unserializeDateFields(data.periods, [constants.fields.PERIOD_START, constants.fields.PERIOD_END]);
            return $(tooltip({
                name : measure.name,
                highValue : this.getFormattedValue(measure.measureType, _.max(items)),
                lowValue : this.getFormattedValue(measure.measureType, _.min(items)),
                startDate : this.getPeriodStartDate(periods),
                endDate : this.getPeriodEndDate(periods)
            }))[0];
        },
        getDisplayDate : function (date) {
            return userFormatters.globalDateTimeFormatter.format(date);
        },
        getPeriodDate : function (periods, key, order) {
            var that = this, period;

            periods = _.chain(periods).filter(function (period) {
                return that.isValid(period.actualExpressionValue);
            }).sortByOrder([key], [order]).value();

            period = _.first(periods);

            return _.isUndefined(period) ? '' : this.getDisplayDate(period[key]);
        },
        getPeriodStartDate : function (periods) {
            return this.getPeriodDate(periods, constants.fields.PERIOD_START, true);
        },
        getPeriodEndDate : function (periods) {
            return this.getPeriodDate(periods, constants.fields.PERIOD_END, false);
        },
        unserializeDateFields : function (periods, dateFields) {
            // eslint-disable-next-line lodash/collection-method-value
            return _.forEach(periods, function (period) {
                _.forEach(dateFields, function (dateField) {
                    if (!moment.isMoment(period[dateField])) {
                        period[dateField] = userFormatters.globalDateTimeFormatter.unserialize(period[dateField]);
                    }
                });
            });
        },
        getTitle : function (measure, items, data) {
            return measure.name;
        },
        isValid : function (value) {
            return !_.isNull(value) && !_.isUndefined(value);
        },
        updateComboBox : function (newValue) {
            this.updateDiscussion(newValue);
            this.updateProjectList(newValue);
        },
        updateDiscussion : function (newValue) {
            var discussionOptions = this._controller.getStore().getDiscussionOptions(newValue);
            if (this._projectListView._gridDiscussion) {
                this._projectListView._gridDiscussion.destroy();
                this._projectListView._gridDiscussion = null;
                this._projectListView._gridWidget.options.joinedColumns = [];
            }
            this._projectListView.setUpDiscussion(discussionOptions);
            if (this._projectListView._gridDiscussion) {
                this._projectListView._gridWidget.options.joinedColumns.push(this._projectListView._gridDiscussion.getIconColumn());
                this._projectListView._gridDiscussion.listen();
            }
        },
        updateProjectList : function (newValue) {
            var that = this, store = this._controller.getStore(), mediator = this._projectListView._mediator;
            store.projectFilter = newValue;
            if (newValue === constants.projectFilterTypes.BUDGET_APPROVED) {
                mediator.type = constants.types.BUDGET_APPROVED_PROJECTS;
            } else if (newValue === constants.projectFilterTypes.RESOURCE_APPROVED) {
                mediator.type = constants.types.RESOURCE_APPROVED_PROJECTS;
            } else {
                mediator.type = constants.types.PROJECTS;
            }
            this.filterCombobox.value({ key : newValue });
            var projectViewConfig = this._projectListView._getViewConfig();
            if ((newValue === constants.projectFilterTypes.BUDGET_APPROVED && !store.isBudgetApprovedProjectsLoaded) ||
                (newValue === constants.projectFilterTypes.RESOURCE_APPROVED && !store.isResourceApprovedProjectsLoaded ||
                newValue !== constants.projectFilterTypes.BUDGET_APPROVED && newValue !== constants.projectFilterTypes.RESOURCE_APPROVED &&
                !store.isProjectsLoaded)) {
                store.updateProjectList().done(function () {
                    that._projectListView._applyViewConfig(_.merge(projectViewConfig.user, projectViewConfig.named));
                    that.showCurrencyBanner(that.selectedView);
                    mediator.updateProjectSummaryRollups(store);
                    mediator.clean();
                    if (newValue === constants.projectFilterTypes.BUDGET_APPROVED) {
                        store.isBudgetApprovedProjectsLoaded = true;
                    } else if (newValue === constants.projectFilterTypes.RESOURCE_APPROVED) {
                        store.isResourceApprovedProjectsLoaded = true;
                    } else {
                        store.isProjectsLoaded = true;
                    }
                });
            } else {
                this._projectListView._applyViewConfig(_.merge(projectViewConfig.user, projectViewConfig.named));
                this.showCurrencyBanner(that.selectedView);
                mediator.updateProjectSummaryRollups(store);
                mediator.clean();
            }
        },
        toggleSparklines : function (enable) {
            this._$el.find('.measure-trend').toggleClass('hidden', !enable);
            this._controller.saveOtherSettings('enableSparklines', enable);
        },
        loadChartData : function (measure, $el, queryParams) {
            var that = this, items = [], dfd = $.Deferred();
            if (queryParams.period) {
                ajax.GET(that.getURI(constants.routes.MEASURE_TREND({
                    portfolioId : queryParams.portfolioId,
                    measureId : measure.id
                }), {
                    period : queryParams.period - 1 // subtracting one for current period
                })).then(function (response) {
                    items = _.chain(response.data.periods).pluck('actualExpressionValue').filter(that.isValid).value();

                    // update sparkline desecription based on data
                    $el.title = that.getTitle(measure, items, response.data);

                    // hide sparkline if the data is too less
                    if (items.length < constants.MIN_PERIODS) {
                        $el.classList.add('invisible');
                    } else {
                        $el.classList.remove('invisible');
                    }

                    dfd.resolve(response.data, items);
                });
            }
            return dfd.promise();
        },
        updateChart : function (options) {
            var $el;
            _.forEach(this._controller.getMeasures().measure, function (measure) {
                $el = this._$el.find('[data-id=' + measure.id + '] .measure-trend');
                this.createChart(measure, $el, this.getViewSettings());
            }, this);
        },
        updateChartOptions : function () {
            var $el, options = this.getViewSettings();
            _.forEach(this._controller.getMeasures().measure, function (measure) {
                $el = this._$el.find('[data-id=' + measure.id + '] .chart-container');
                $el.ojSparkChart('option', {
                    highColor : options.highColor,
                    lowColor : options.lowColor,
                    markerShape : options.markerShape,
                    markerSize : options.markerSize
                });
            }, this);
        },
        refreshSparklines : function (saveData) {
            if (saveData.enableSparklines) {
                if (saveData.sparklinePeriods && saveData.sparklinePeriods !== this.getViewSettings().sparklinePeriods) {
                    this._controller.saveOtherSettings('sparklinePeriods', saveData.sparklinePeriods);
                    this._controller.saveOtherSettings('highlightHighLowValue', saveData.highlightHighLowValue);
                    this.updateChart(saveData);
                } else if (_.has(saveData, 'highlightHighLowValue') && saveData.highlightHighLowValue !== this.getViewSettings().highlightHighLowValue) {
                    this._controller.saveOtherSettings('highlightHighLowValue', saveData.highlightHighLowValue);
                    this.updateChartOptions();
                }
            }
        },
        updateLastCalculatedDate : function () {
            this.setLastCalculatedDate(dateFormatter.unserialize(this._controller.getLastCalculatedDate()));
        },
        setLastCalculatedDate : function (date) {
            if (_.isNull(date)) {
                this.$measureRefreshBtn.attr('title', localizer.getFormattedString('label.global_recalculate_portfolio_measures_last_ran',
                    localizer.getString('label.cp_not_applicable')));
                this.$measureRefreshIcon.attr('title', localizer.getFormattedString('label.global_recalculate_portfolio_measures_last_ran',
                    localizer.getString('label.cp_not_applicable')));
            } else {
                this.$measureRefreshBtn.attr('title', localizer.getFormattedString('label.global_recalculate_portfolio_measures_last_ran',
                    userFormatters.globalDateTimeFormatter.format(date)));
                this.$measureRefreshIcon.attr('title', localizer.getFormattedString('label.global_recalculate_portfolio_measures_last_ran',
                    userFormatters.globalDateTimeFormatter.format(date)));
            }
        },

        printPage : function () {
            var printWindow = window.open('', 'printWindow', 'width=1024,height=768');
            printWindow.document.write('<!DOCTYPE html>');
            this.appendPrintContent(printWindow);
            this.print(printWindow);
        },

        appendPrintContent : function (printWindow) {
            printWindow.document.write($('.print-content').clone().prop('outerHTML'));
            printWindow.document.write(this.getGridContent().html());
            printWindow.document.write($(window.document.head).html());
        },

        getGridContent : function (printWindow) {
            var toggle = this._$el.find('.project').hasClass('active') ? 'project' : 'portfolio';
            if (toggle === 'project') {
                return this._projectListView._$grid.grid('getPrintContent');
            }
            return this._portfolioListView._$grid.grid('getPrintContent');
        },

        setProgramMsDownBanner : function () {
            var programMSErrorCode = '013000000';
            var errorCodeLinkTemplate = 'http://docs.oracle.com/cd/E80480_01/English/admin/error_message_reference/PRM-{0}.htm';
            var errorCode = 'PRM-' + programMSErrorCode;
            var bannerArgs = {
                showLink : true,
                errorCode: errorCode,
                errorLink: localizer.formatString(errorCodeLinkTemplate, programMSErrorCode),
                dismissText : localizer.getString('label.prioritization_matrix_dismiss'),
                text : localizer.getString('application_error.error_SERVICE_NOT_AVAILABLE_PROGRAM')
            };
            this._controller.getStore()._trigger('program-fetch-failed', bannerArgs);
        },

        print : function (printWindow) {
            printWindow.addEventListener('load', function () {
                printWindow.print();
                printWindow.close();
            }, false);
            printWindow.document.close();
            printWindow.focus();
        },
        _getViewConfig : function () {
            var toggle,
                projectView,
                portfolioView,
                store = this._controller.getStore();

            if (this._$el.find('.project').hasClass('active')) {
                toggle = 'project';
            } else if (this._$el.find('.portfolio').hasClass('active')) {
                toggle = 'portfolio';
            }
            if (!_.isEmpty(store.items(constants.types.PROJECTS)) ||
                !_.isEmpty(store.items(constants.types.PORTFOLIO))) {
                projectView = this._projectListView._getViewConfig();
                portfolioView = this._portfolioListView._getViewConfig();
            }
            return {
                _userAndNamedSeparate : true,
                user : {
                    projectList : _.get(projectView, 'user', {}),
                    portfolioList : _.get(portfolioView, 'user', {}),
                    dock : this.splitPane ? this.splitPane.getSplitterViewData() : {},
                    toggle : toggle
                },
                named : {
                    projectList : _.get(projectView, 'named', ''),
                    portfolioList : _.get(portfolioView, 'named', ''),
                    visibleMeasures : _.clone(this._controller._model.selectedMeasures),
                    otherSettings : _.cloneDeep(this._controller._model.otherSettings),
                    showFilter : this._controller._model.projectFilter
                }
            };
        },
        _applyViewConfig : function (viewConfig) {
            if (!_.isEmpty(viewConfig)) {
                if (_.has(viewConfig, 'visibleMeasures')) {
                    this.showSelectedMeasures(viewConfig.visibleMeasures);
                }
                if (_.has(viewConfig, 'otherSettings.enableSparklines')) {
                    this.toggleSparklines(viewConfig.otherSettings.enableSparklines);
                }
                if (_.has(viewConfig, 'otherSettings')) {
                    this.refreshSparklines(viewConfig.otherSettings);
                }
                this.selectedView = viewConfig.toggle;
                this._projectListView._applyViewConfig(viewConfig.projectList || {});
                this._portfolioListView._applyViewConfig(viewConfig.portfolioList || {});
                this.showCurrencyBanner();
                this.splitPane.applySplitterViewData(viewConfig.dock || {});
                if (_.has(viewConfig, 'otherSettings.measureView')) {
                    this.measureView.data({ value : viewConfig.otherSettings.measureView });
                } else {
                    this.measureView.data({ value : 'value-icon' });
                    this._controller._model.views.resetCurrentView(true);
                    this._controller._model._subscribable.trigger('current-view-updated');
                }
                if (viewConfig.showFilter === constants.projectFilterTypes.REVIEW) {
                    this.updateProjectList(viewConfig.showFilter);
                } else if (viewConfig.showFilter === constants.projectFilterTypes.BUDGET_APPROVED) {
                    this.updateProjectList(viewConfig.showFilter);
                } else if (viewConfig.showFilter === constants.projectFilterTypes.RESOURCE_APPROVED) {
                    this.updateProjectList(viewConfig.showFilter);
                } else {
                    this.updateProjectList(constants.projectFilterTypes.ALL);
                }
            }
            this._controller._model._subscribable.trigger('current-view-updated');
        },
        showCurrencyBanner : function (selectedView) {
            var showProject = selectedView === 'project';
            this._controller.getStore().getProjectListMultiCurrencyHelper().toggleActive(showProject);
            this._controller.getStore().getPortfolioListMultiCurrencyHelper().toggleActive(!showProject);
        }
    });

    return PortfolioPerformanceScorecardView;
});
