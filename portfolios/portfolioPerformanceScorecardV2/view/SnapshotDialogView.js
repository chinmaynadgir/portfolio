define(['jquery', 'lodash',
    'oui', 'discussionsWidget',
    'localizer',
    'bpc/page/singleGrid/SingleGridView',
    'primutils/ui/dialogs/AJAXErrorHandler',
    'src/portfolios/portfolioPerformanceScorecardV2/model/SnapshotDialogGridMediator',
    'src/portfolios/portfolioPerformanceScorecardV2/view/grid/SnapshotDialogGridConfig',
    'src/portfolios/portfolioPerformanceScorecardV2/portfolioPerformanceScorecardConstants',
    'hbr!src/portfolios/portfolioPerformanceScorecardV2/view/templates/SnapshotDialogTemplate.hbs',
    'hbr!shared/multicurrency/banner.hbs'
], function ($, _, oui, DiscussionsWidget, localizer, SingleGridView, AJAXErrorHandler, Mediator, gridConfig, constants, markup, bannerFactory) {
    'use strict';

    return class SnapshotDialogView extends SingleGridView {
        constructor (controller, model, project, columns) {
            super(...arguments);
            this._columns = columns;
            this._project = project;
            this.currentCurrencyType = model.getProjectListMultiCurrencyHelper().getMulticurrencySettingsController().currentCurrencyType;
            this.attach();
            this.init();
        }

        init () {
            const that = this;
            this._controller._load(this._project).done(() => {
                that._loaded();
            }).fail(AJAXErrorHandler.callbackForMessage(this._project && this._project.name ?
                localizer.getFormattedString('message.cp_error_load_snapshots_item', this._project.name) :
                localizer.getString('message.cp_error_load_snapshots')));
        }

        _initComponents () {
            SingleGridView.prototype._initComponents.apply(this, arguments);
            this._controller._model.selectedProjectId = this._options.id;
            const discussionsEnabled = this._controller.getMetadata().osnEnabled;
            this.$discussionsWidget = null;
            this._$el.find('.currency-banner').remove();
            const $snapshotCurrency = this._$el.find('#snapshot-currency');
            const store = this._controller.getStore();
            const mcHelper = store.getProjectListMultiCurrencyHelper();
            if (mcHelper._viewCurrencyBanner) {
                const bannerLabel = mcHelper.getBannerLabel();
                const $mcbanner = $(bannerFactory({
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
        }

        _initListeners (...args) {
            super._initListeners(...args);
            var that = this;
            const store = that._controller.getStore();
            this.timeframeComboBox.on('valueSelected', (event) => {
                store.snapshotFilter = event.value;
                that._$grid.grid('repopulate');
            });
            this._$el.on('shown', () => {
                const sortBy = [{
                    dataIndex : 'time',
                    order : 'dsc'
                }];
                that._$grid.grid('resize');
                that._$grid.grid('repopulate');
                that._$grid.grid(('option', 'sortBy', sortBy));
            });
            this._$el.on('hide', () => {
                store.getProjectListMultiCurrencyHelper().getMulticurrencySettingsController().setCurrencyType(that.currentCurrencyType);
            });
        }

        _loaded (...args) {
            super._loaded(...args);
            this._$el.modal('show');
        }

        attach () {
            $(document.body).append(this._$el);
        }

        buildElement () {
            return $(markup({
                projectName : this._options.name
            }));
        }

        _getGridConfig (metadata) {
            return gridConfig(metadata, this._columns);
        }

        // eslint-disable-next-line class-methods-use-this
        _getMediator () {
            return Mediator;
        }

        // eslint-disable-next-line class-methods-use-this
        selected (records) {

        }
    };
});
