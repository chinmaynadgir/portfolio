define(['jquery', 'lodash',
    'oui', 'discussionsWidget',
    'localizer',
    'bpc/page/singleGrid/SingleGridView',
    'primutils/ui/dialogs/AJAXErrorHandler',
    'src/portfolios/portfolioPerformanceScorecard/model/SnapshotDialogGridMediator',
    'src/portfolios/portfolioPerformanceScorecard/view/grid/SnapshotDialogGridConfig',
    'src/portfolios/portfolioPerformanceScorecard/portfolioPerformanceScorecardConstants',
    'hbr!src/portfolios/portfolioPerformanceScorecard/view/templates/SnapshotDialogTemplate.hbs',
    'hbr!shared/multicurrency/banner.hbs'
], function ($, _, oui, DiscussionsWidget, localizer, SingleGridView, AJAXErrorHandler, Mediator, gridConfig, constants, markup, bannerFactory) {
    'use strict';

    function SnapshotDialogView (controller, model, project, columns) {
        this._columns = columns;
        this._project = project;
        this.currentCurrencyType = model.getProjectListMultiCurrencyHelper().getMulticurrencySettingsController().currentCurrencyType;
        SingleGridView.apply(this, arguments);
        this.attach();
        this.init();
    }

    SnapshotDialogView.prototype = _.assign(Object.create(SingleGridView.prototype), {
        constructor : SnapshotDialogView,

        init : function () {
            var that = this;
            this._controller._load(this._project).done(function () {
                that._loaded();
            }).fail(AJAXErrorHandler.callbackForMessage(this._project && this._project.name ?
                localizer.getFormattedString('message.cp_error_load_snapshots_item', this._project.name) :
                localizer.getString('message.cp_error_load_snapshots')));
        },

        _initComponents : function () {
            SingleGridView.prototype._initComponents.apply(this, arguments);
            this._controller._model.selectedProjectId = this._options.id;
            var discussionsEnabled = this._controller.getMetadata().osnEnabled;
            this.$discussionsWidget = null;
            this._$el.find('.currency-banner').remove();
            var $snapshotCurrency = this._$el.find('#snapshot-currency'),
                portfolioPerfScoremodel = this._controller.getStore(),
                mcHelper = portfolioPerfScoremodel.getProjectListMultiCurrencyHelper();
            if (mcHelper._viewCurrencyBanner) {
                var bannerLabel = mcHelper.getBannerLabel();
                var $mcbanner = $(bannerFactory({
                    id : this._options.id,
                    currencyType : bannerLabel.type,
                    currencyLabel : bannerLabel.label
                }));
                $snapshotCurrency.append($mcbanner);
            }

            this.$timeframeArea = this._$el.find('#timeframe-selector-area');
            this.timeframeComboBox = new oui.ComboBox({
                keyboardInput : false
            }, [
                {
                    value : 'all',
                    display : localizer.getString('label.global_all')
                },
                {
                    value : 'pastMonth',
                    display : localizer.getString('label.proj_costing_timeframe_past_month')
                },
                {
                    value : 'pastSix',
                    display : localizer.getString('label.proj_costing_timeframe_past_six')
                },
                {
                    value : 'pastYear',
                    display : localizer.getString('label.proj_costing_timeframe_past_year')
                }
            ]).init();
            this.timeframeComboBox.selected({ value : 'all' });
            this.$timeframeArea.append(this.timeframeComboBox.element());

            this.$discussionsDiv = this._$el.find('.project-snapshot-comments');

            if (!discussionsEnabled) {
                this.$discussionsDiv.addClass('hidden');
                this._$el.addClass('without-discussions');
            }
            this.$discussionsWidget = new DiscussionsWidget({
                modal : false,
                paginationSize : 3,
                entityType : 'project',
                stateFunctions : {
                    currentEntityId : this._project.id
                }
            }, this.$discussionsDiv);
            if (discussionsEnabled) {
                this.$discussionsWidget.discussions('refresh');
            }
        },

        _initListeners : function () {
            SingleGridView.prototype._initListeners.apply(this, arguments);
            var that = this;
            this.timeframeComboBox.on('valueSelected', function (event) {
                that._controller._model.snapshotFilter = event.value;
                that._$grid.grid('repopulate');
            });
            this._$el.on('shown', function () {
                var sortBy = [{
                    dataIndex : 'time',
                    order : 'dsc'
                }];
                that._$grid.grid('resize');
                that._$grid.grid('repopulate');
                that._$grid.grid(('option', 'sortBy', sortBy));
            });
            this._$el.on('hide', function () {
                that._controller.getStore().getProjectListMultiCurrencyHelper().getMulticurrencySettingsController().setCurrencyType(that.currentCurrencyType);
            });
        },

        _loaded : function () {
            SingleGridView.prototype._loaded.apply(this, arguments);
            this._$el.modal('show');
        },

        attach : function () {
            $(document.body).append(this._$el);
        },

        buildElement : function () {
            return $(markup({
                localizer : localizer,
                projectName : this._options.name
            }));
        },

        _getGridConfig : function (metadata) {
            return gridConfig(metadata, this._columns);
        },

        _getMediator : function () {
            return Mediator;
        },

        selected : function (records) {

        }

    });
    return SnapshotDialogView;
});
