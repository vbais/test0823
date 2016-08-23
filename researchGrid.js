define([
    'backbone'
    , 'marionette'
    , 'app'
    , 'Handlebars'
    , 'backgrid'
    , 'bootstrap'
    , 'typeahead'
    , 'accessRequest/research/views/backbone.radio.min'
    , 'backgrid-select-all'
    , 'accessRequest/common/collections/userProfileCollection'
    , 'hbs!accessRequest/research/templates/FooterTpl'
    , 'accessRequest/research/views/researchConstants'
    , 'accessRequest/research/views/researchChannel'
],
function (
    Backbone
    , Marionette
    , App
    , Handlebars
    , Backgrid
    , bootstrap
    , t
    , Radio
    , Extension
    , UserProfileCollection
    , Tpl
    , ResearchConstants
    , ResearchChannel
) {
    var ResearchGrid = {};

    ResearchGrid.guId = function guId() {
        function _p8(s) {
            var p = (Math.random().toString(16) + "000000000").substr(2, 8);
            return s ? "-" + p.substr(0, 4) + "-" + p.substr(4, 4) : p;
        }
        return _p8() + _p8(true) + _p8(true) + _p8();
    };

    // Modal dialog box for the grid
    ResearchGrid.NamsModal = Backbone.View.extend({
        initialize: function (options) {
            this.options = options;
        },
        el: '#namsModalStub',
        template: Handlebars.compile(
            `
            <div id="namsModal" class="modal fade" role="dialog">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
								<button type="button" id='namsModalClose' class="close" data-dismiss="modal">&times;</button>
                            <h4 class="modal-title">{{modalHeader}}</h4>
                        </div>
                        <div class="modal-body">
                            <div id="namsModalChild"></div>
                        </div>
                        <div class="modal-footer">
								<button type="button" id='namsModalSubmit' class="btn btn-default" data-dismiss="modal">Submit</button>
								<button type="button" id='namsModalCancel' class="btn btn-default" data-dismiss="modal">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
            `
    ),
        render: function () {
            this.$el.html(this.template({ modalHeader: this.options.modalHeader }));
            this.childView = this.options.childView;
            this.childView.setElement(this.$el.find('#namsModalChild'));
            this.childView.render();
            this.childView.delegateEvents();
            return (this);
        },
        events: {
            'click #namsModalSubmit': function (e) {
                ResearchChannel.request('submit:clicked:command');
                this.undelegateEvents();
            },
            'click #namsModalCancel': function () {
                ResearchChannel.request('cancel:clicked:command');
                this.undelegateEvents();
            },
            'click #namsModalClose': function () {
                ResearchChannel.request('cancel:clicked:command');
                this.undelegateEvents();
            }
        }
    });

    // Header
    ResearchGrid.ButtonHeader = Backgrid.HeaderCell.extend({
        initialize: function (options) {
            ResearchGrid.ButtonHeader.__super__.initialize.apply(this, arguments);
            this.options = options;
            this.collection.bind(
				'add remove reset',
				function () {
				    if (options.collectionChanged) {
				        options.collectionChanged(this);
				    }
				}, this);

        },
        template: Handlebars.compile(`
			<span>{{columnLabel}}</span>
			<button class="button blue-outline-button">
				{{buttonLabel}}
			</button>
		`),
        events: {
            'click button': 'buttonClicked'
        },
        buttonClicked: function () {
            if (this.options.buttonClicked) {
                this.options.buttonClicked();
            }
        },
        render: function () {
            var columnLabel = this.options.column.get('label'),
                buttonLabel = 'Button';
            if (this.options.buttonLabel) {
                buttonLabel = this.options.buttonLabel;
            }
            this.$el.html(this.template({ columnLabel: columnLabel, buttonLabel: buttonLabel }));
            this.$el.find('button').hide(); //hide the button
            this.delegateEvents();
            return this;
        }
    });

    var DTCCDataPolicyHeader = ResearchGrid.ButtonHeader.extend({
        initialize: function (options) {
            DTCCDataPolicyHeader.__super__.initialize.apply(this, arguments);
            options.buttonLabel = 'Notify Users';
            options.buttonClicked = function () {
                console.log('Notifying users of DTCC Data Policy');
            };
            options.collectionChanged = function (it) {
                it.$el.find('button').hide();
                it.collection.forEach(function (current, index, collection) {
                    if (current.get('dtccDataPolicy') === false) {
                        it.$el.find('button').show();
                    }
                });
            };
        }
    });

    // Rows
    ResearchGrid.SelectableRow = Backgrid.Row.extend({
        initialize: function (options) {
            ResearchGrid.SelectableRow.__super__.initialize.apply(this, arguments);
            this.listenTo(this.model, "backgrid:selected", function (model, checked) {
                if (checked) {
                    this.$el.addClass("selected");
                    if (model.collection.selectedCount) {
                        model.collection.selectedCount++;
                    } else {
                        model.collection.selectedCount = 1;
                    }
                    ResearchChannel.request('selected:count', model.collection.selectedCount);
                }
                else {
                    this.$el.removeClass("selected");
                    if (model.collection.selectedCount) {
                        model.collection.selectedCount--;
                    }
                    ResearchChannel.request('selected:count', model.collection.selectedCount);
                }
            });
        }
    });

    //Cells
    ResearchGrid.SelectCell = Backgrid.Extension.SelectRowCell.extend({
        initialize: function (options) {
            ResearchGrid.SelectCell.__super__.initialize.apply(this, arguments);
            _.extend(this.events, Backgrid.Extension.SelectRowCell.prototype.events);
        },
        events: {
            'click [type="checkbox"]': 'clicked'
        }
    });

    ResearchGrid.DeleteCell = Backgrid.Cell.extend({
        template: function () {
            var template = `<button type="button" class="delete-icon" title="Delete row"></button>`;
            return (template);
        },
        events: {
            "click button": "deleteRow"
        },
        deleteRow: function (e) {
            e.preventDefault();
            var coll = this.model.collection;

            if (this.beforeDelete) { //for DTCC column delete functionality
                this.beforeDelete(coll); //available from child stored in prototype
            }
            this.model.destroy();
        },
        render: function () {
            this.$el.html(this.template());
            this.delegateEvents();
            return this;
        }
    });

    ResearchGrid.EditCell = Backgrid.StringCell.extend({
        render: function () {
            ResearchGrid.EditCell.__super__.render.apply(this);
            this.$el.empty();
            this.currentEditor = new this.editor({
                column: this.column,
                model: this.model,
                formatter: this.formatter
            });
            this.model.trigger("backgrid:edit", this.model, this.column, this, this.currentEditor);
            this.$el.append(this.currentEditor.$el);
            this.currentEditor.render();
            this.$el.addClass("editor");
            this.delegateEvents();
            return this;
        }
    });

    ResearchGrid.DropDownCell = Backgrid.Cell.extend({
        initialize: function (options) {
            ResearchGrid.DropDownCell.__super__.initialize.apply(this, arguments);
            this.options = options;
        },        

        template: Handlebars.compile(`
			<div style='display: inline-block;'>
                <div class="controls">
                    <select style='width: 125px'>
					    {{#each data}}
						    <option value='{{this}}'>{{this}} </option>
					    {{/each}}
				    </select>
                </div>
            <button id='btnDTCCPolicy' class='button blue-outline-button in-table' style='float:right'>Data Policy</button>
            </div>
		`),

        render: function () {
            this.$el.append(this.template({ data: this.options.data }));
            this.$el.find('button').hide();
            this.delegateEvents();
            return this;
        }
    });

    ResearchGrid.HtmlCell = Backgrid.HtmlCell = Backgrid.Cell.extend({
        className: "html-cell",
        initialize: function () {
            Backgrid.Cell.prototype.initialize.apply(this, arguments);
        },
        render: function () {
            this.$el.empty();
            var rawValue = this.model.get(this.column.get("name"));
            var formattedValue = this.formatter.fromRaw(rawValue, this.model);
            this.$el.append(formattedValue);
            this.delegateEvents();
            return this;
        }
    });

    // Formatters
    ResearchGrid.TermsOfUseFormatter = _.extend({}, Backgrid.CellFormatter.prototype, {
        fromRaw: function (rawValue, model) {
            var result = undefined;
            if (rawValue === true) {
                result = '<div class="tou-agree green">Agreed to T.O.U.</div>';
            } else {
                result = '<div class="tou-not-agree red">Not Agreed to T.O.U.</div>';
            }
            return result;
        }
    });

    ResearchGrid.CsiEligibilityFormatter = _.extend({}, Backgrid.CellFormatter.prototype, {
        fromRaw: function (rawValue, model) {
            var result = undefined;
            if (rawValue === 'Interim-InternalFR') {
                result = '<div class="csi-internalfr red">Internal FR</div>';
            } else if (rawValue === 'Unknown') {
                result = '<div class="csi-pending orange">Pending Verification</div>';
            } else {
                result = '<div class="csi-eligible green">Eligible</div>';
            }
            return result;
        }
    });

    ResearchGrid.DTCCFormatter = _.extend({}, Backgrid.CellFormatter.prototype, {
        fromRaw: function (rawValue, model) {
            var result = undefined;
            if (rawValue === true) {
                result = '<div class="dtcc-agree green">Agreed to DTCC Data Policy</div>';
            } else {
                result = '<div class="dtcc-not-agree red">Not Agreed to DTCC Data Policy</div>';
            }
            return result;
        }
    });

    //Footers
    ResearchGrid.ADSearchFooter = Backgrid.Footer.extend({
        initialize: function (options) {
            this.options = options;

            var addLabel = 'Add';
            if (this.options.addLabel) {
                addLabel = this.options.addLabel;
            }
            this.addLabel = addLabel;

            options.guId = ResearchGrid.guId();
            this.collection.bind('add remove reset',
                this.setRowCount
                , this);
        },
        setADSearch: function (options) {
            var result = new Bloodhound({
                datumTokenizer:
                function (d) {
                    return Bloodhound.tokenizers.whitespace(d[options.adSearchConfig.searchFieldName]);
                },
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                remote: {
                    url: options.adSearchConfig.url
                }
            });
            result.initialize();
            var frsTypeAhead = $('#' + options.guId + ' .typeahead').typeahead({
                hint: true,
                highlight: true,
                minLength: 1
            },
                {
                    name: 'ds1',
                    display: 'name',
                    source: result.ttAdapter()
                });
            frsTypeAhead.bind('typeahead:selected', function (ev, suggestion) {
                options.selectedObject = suggestion;
            });
        },
        template: Handlebars.compile(`
			<tr>
				<td colspan="500">
					<div id="{{NamsGridSearch}}" style="float:left">
						<input class="typeahead" type="text" placeholder="Search by User ID or First Name Last Name">
					</div>
					<button>{{label}}</button>
					<span style="float:right">Total:{{this.collection.length}}</span>
				</td>
			</tr>`),
        events: {
            'click button': "addRow"
        },
        render: function () {
            this.$el.html(this.template({ NamsGridSearch: this.options.guId, label: this.addLabel }));
            this.delegateEvents();
            var it = this;
            _.defer(function () {
                it.setADSearch(it.options);
            });
            return this;
        },
        setRowCount: function () {
            this.$el.html(this.template({ NamsGridSearch: this.options.guId, label: this.addLabel }));
        },
        addRow: function (e) {
            if (this.options.selectedObject) {
                var myModel = new this.collection.model();
                var outputFieldNames = this.options.adSearchConfig.outputFieldNames;
                for (i = 0; i < outputFieldNames.length; i++) {
                    myModel.set(outputFieldNames[i], this.options.selectedObject[outputFieldNames[i]]);
                }
                var loginName = this.options.selectedObject.loginName;
                var isLoginNameExists = this.collection.findWhere({ loginName: loginName });
                if (!isLoginNameExists) {
                    this.collection.add(myModel);
                    this.options.selectedObject = undefined;
                    var it = this;
                    _.defer(function () { it.setADSearch(it.options); });
                }
            }
        }
    });

    ResearchGrid.ADSearchFooter1 = Backgrid.Footer.extend({
        initialize: function (options) {
            this.options = options;

            var addLabel = 'Add';
            if (this.options.addLabel) {
                addLabel = this.options.addLabel;
            }
            this.addLabel = addLabel;

            options.guId = ResearchGrid.guId();
            this.collection.bind('add remove reset',
                this.setRowCount
                , this);
        },
        template: Tpl,

        setADSearch: function (options) {
            var inputBox = this.$el.find('#' + options.guId);
            inputBox.attr('autocomplete', 'off');
            var self = this;

            _.defer(function () {
                inputBox.typeahead({
                    minLength: 3,
                    autoSelect: true,
                    source: function (query, process) {
                        onSource(query, process);
                    }
                });
            });

            // onSource gets called for every character entered in typehead text box.
            function onSource(query, process) {

                var _domainSelected = "RB", // $($("[name='Domains'] option")[0]).text(),//$("[name='Domains'] option").text(), //self.model.get('Domains'),  // fetch the values.
                    _searchTerm = query, //self.model.get('SearchTerm'),
                    _suggetionItems = [],
                    _userProfileCollection = new UserProfileCollection();  // Create a connection				    
                _userProfileCollection.url = '/api/userProfile/searchextended?domain=' + _domainSelected + '&searchTerm=' + _searchTerm + '&isWildCardOn=true';
                //fetch.
                _userProfileCollection.fetch({
                    reset: true,
                    success: function (collection, response, options) {
                        var _ups = []; //array of mathing objects.
                        collection.each(function (userProfile) {
                            _ups.push({ id: userProfile.get('LoginId'), name: userProfile.get('displayName'), userProfile: userProfile }); // add it to array
                        });
                        process(_ups); // this call sets matching user profiles in typehaead dropdown.
                    },
                    error: function (collection, response, options) {
                        console.log('userProfileCollection:fetch() onFail:', collection.models.length);
                    }
                });
            }
            inputBox.change(function () {
                var currentSelection = inputBox.typeahead('getActive');
                if (currentSelection) {
                    window.selectedUser = currentSelection.userProfile;
                }
            });

        },

        events: {
            'click button': "addRow"
        },

        render: function () {
            this.$el.html(this.template({ searchboxid: this.options.guId, label: this.options.addLabel, rowcount: this.collection.length }));
            return this;
        },


        setRowCount: function () {
            this.$el.html(this.template({ searchboxid: this.options.guId, label: this.options.addLabel, rowcount: this.collection.length }));
            this.setADSearch(this.options);
        },
        addRow: function () {
            var myModel = new this.collection.model();
            myModel.set('name', window.selectedUser.attributes['fullName'] + " [" + window.selectedUser.attributes['loginId'] + "]");
            myModel.set('termsOfUse', window.selectedUser.attributes['istouAgreed']);
            myModel.set('csiEligibility', window.selectedUser.attributes['csiEligibility']);
            myModel.set('dtccDataPolicy', window.selectedUser.attributes['isSecurityContact']);

            this.collection.add(myModel);
            this.$el.find(".typeahead").val("");
        }

    });

    ResearchGrid.AddRowFooter = Backgrid.Footer.extend({
        template: _.template(`
				<tr>
					<td colspan="500">
                        <button class="plus-sign" type="button"><%= label %></button>

						<div class="count">Total: <%= this.collection.length %></div>
					</td>
				</tr>
			`),
        events: {
            'click button': "addRow"
        },
        initialize: function (options) {
            var addLabel = 'Add';
            if (options.addLabel) {
                addLabel = options.addLabel;
            }
            this.collection.bind(
                'add remove reset',
                function () {
                    this.$el.html(this.template({ label: addLabel }));
                }, this);
            if (typeof (options.repo) != "undefined") {
                window.repo = options.repo;
            }
        },
        render: function () {
            this.$el.html(this.template({ label: this.options.addLabel }));
            return this;
        },
        addRow: function (event) {
            event.preventDefault();
            var myModel = new this.collection.model();
            this.collection.add(myModel);
        }
    });

    ResearchGrid.SelectCountFooter = Backgrid.Footer.extend({
        template: Handlebars.compile(
            `
					<span>Total Selected: <\span>
					<span>{{selectedCount}}</span>
				`
        ),
        self: undefined,
        initialize: function () {
            this.$el.html(this.template({ selectedCount: 0 }));
            it = this;
        },
        render: function () {
            ResearchChannel.reply('selected:count', function (selectedCount) {
                it.$el.html(it.template({ selectedCount: selectedCount }));
            });
            this.$el.html(this.template({ selectedCount: 0 }));
            return (this);
        }
    });

    //Grids
    ResearchGrid.Grid = Backgrid.Grid.extend({
    });

    var frsDtccColumn =
    {
        name: "dtccDataPolicy",
        label: "DTCC Data Policy",
        editable: "false",
        //headerCell: DTCCDataPolicyHeader,
        cell: "html",
        formatter: ResearchGrid.DTCCFormatter
    };

    ResearchGrid.FrsGrid = Backgrid.Grid.extend({
        initialize: function (options) {
            ResearchGrid.FrsGrid.__super__.initialize.apply(this, arguments);
            var self = this;
            ResearchChannel.on('dtcc:remove', function () {
                if (self.isDtccColumnAdded) {
                    self.columns.at(self.columns.length - 2).destroy();   //remove({ at: frsCoAuthorsGrid.columns.length - 1 });
                    self.isDtccColumnAdded = false;
                }
            });

            ResearchChannel.on('dtcc:add', function () {
                if (!self.isDtccColumnAdded) {
                    self.columns.add(frsDtccColumn, { at: self.columns.length - 1 });
                    self.isDtccColumnAdded = true;
                }
            });
        }
    });

    return (ResearchGrid);
});
