var app = {}
app.settings = {
	memberTemplate: '#member-point-tpl',
	listItemTemplate: '#member-list__item-tpl',
	paperTemplate: '#expanded-paper-details-tpl',
	baseId: 'member_base',
	urls: {
		members: 'data/gear_profiles.json',
		papers: 'data/gear_papers.json'
	}
}
app.data = {}

app.connectMembers = function (sourceMemberId, targetMemberId, data, options) {
	var self = this
	var s = self.settings
	var d = self.data
	if($('#'+sourceMemberId).length && $('#'+targetMemberId).length){
		jsPlumb.ready(function() {
			var plInstance = jsPlumb.getInstance();

			var color= '#449';
			var source_ofs = $('#'+sourceMemberId).offset();
			var target_ofs = $('#'+targetMemberId).offset();
			var sourcePosition = "BottomCenter",
				targetPosition = "TopCenter",
				sourcePosition__v,
				sourcePosition__h,
				targetPosition__v,
				targetPosition__h;
			// if source_el is top and target_el is bottom then place anchors oposite
			// if source_el is left and target_el is right then place anchors oposite
			if(source_ofs.top && target_ofs.top){
				var source_higher = source_ofs.top < target_ofs.top;
				var source_lower = source_ofs.top > target_ofs.top;
				var source_v_equal = source_ofs.top === target_ofs.top;
				if(source_higher) {
					sourcePosition__v = "Bottom";
					targetPosition__v = "Top";
				} else if (source_lower) {
					targetPosition__v = "Bottom";
					sourcePosition__v = "Top";
				} else {
					sourcePosition__v = "";
					targetPosition__v = "";
				}
			}
			if(source_ofs.left && target_ofs.left){
				var source_right = source_ofs.left > target_ofs.left;
				var source_left = source_ofs.left < target_ofs.left;
				var source_h_equal = source_ofs.left === target_ofs.left;
				if (source_right) {
					sourcePosition__h = "Left";
					targetPosition__h = "Right";
				} else if (source_left) {
					sourcePosition__h = "Right";
					targetPosition__h = "Left";
				} else {
					sourcePosition__h = "Center";
					targetPosition__h = "Center";
				}
			}

			sourcePosition = sourcePosition__v + sourcePosition__h;
			targetPosition = targetPosition__v + targetPosition__h;

			var Settings = function () {
				var settings = {
					Connector : [ "Bezier", { curviness: 1 } ],
					Anchors : [
						[ "Perimeter", { shape: "Circle", rotation: 25 }],
						[ "Perimeter", { shape: "Circle", rotation: 25 }]
					],
					DragOptions : { cursor: "pointer", zIndex:2000 },
					PaintStyle : { strokeStyle:color, lineWidth:2 },
					EndpointStyle : { radius:2, fillStyle:color },
					HoverPaintStyle : {strokeStyle:"#ec9f2e", lineWidth:5 },
					EndpointHoverStyle : {fillStyle:"#ec9f2e" },
					Container:"js_draw_members"
				}
				return settings
			}

			// "#ffa", "#aff", "#faf", "#aaf"

			var plSettings = new Settings();
			plInstance.importDefaults(plSettings);
			plInstance.connect  ({source:sourceMemberId+'', target:targetMemberId+'', scope:data,reattach:true});

			// On connection click
			plInstance.bind("click", function(conn, originalEvent) {
				// Get source/target ids
				var sourceMemberPapers = app.getMemberPapers(conn.sourceId * 1, d.papers)
				var commonPapers = app.getMemberPapers(conn.targetId * 1, sourceMemberPapers)
				// Get all common papers
				if(options && options.personalChart) {
					commonPapers = app.getMemberPapers(options.baseId * 1, commonPapers)
				}
				// List papers
				var paperTemplate = $(s.paperTemplate).html()
				var compiledTemplate = Handlebars.compile(paperTemplate)
				var dataHtml = ''
				if (commonPapers.length > 1) {
					dataHtml += '<ul>'
				}
				_(commonPapers).each(function (paper) {
					var itemHtml = compiledTemplate(paper)
					if (commonPapers.length > 1) {
						dataHtml += '<li>' + itemHtml + '</li>'
					} else {
						dataHtml += itemHtml
					}
				})
				if (commonPapers.length > 1) {
					dataHtml += '</ul>'
				}

				$('.js_expanded_paper_details').html(dataHtml)
				$('#expandedPaperModal').modal('show')
			});

			plInstance.bind("connectionMoved", function(params) {
				console.log("connection " + params.connection.id + " was moved");
			});
		});
	} else {
		console.log('member not found');
	}
}

app.getNewVerticalPosition = function (baseElementId) {
	var id = '#' + baseElementId
	var bottomHeight = ($(id).css('bottom')) ? $(id).css('bottom').replace('px','') : ''
	return ($(id)) ? parseInt(bottomHeight) + $(id).height() + 200 : 0
}
app.getAllPapers = function () {
	var self = this
	var s = self.settings
	var d = self.data

	$.getJSON('/data/gear_papers_final.json')
	.done(function (data) {
		var papers = data.papers
		var members = []
		_.each(papers, function (paper) {
			_.each(paper.collaborator_ids, function (collaborator_id) {
				members.push(collaborator_id)
			})
		})
		members = _.unique(members)
		// members = _.sortBy(members)
		d.members = members
		d.papers = papers
		app.getAllMembers(members, papers)
	})
}
app.getMemberPapers = function(memberId, papers) {
	// console.log(papers)
	var memberPapers = []
	_(papers).each(function(paper) {
		var memberIndex = _.indexOf(paper.collaborator_ids, memberId)
		// console.log(paper.collaborator_ids)
		// console.log(memberIndex)
		if(!!(memberIndex>=0)) {
			memberPapers.push(paper)
		}
	})
	// console.log(memberPapers)
	return memberPapers
}
app.getPaperMembers = function() {

}
app.getAllMembers = function (filterList, papers, options) { // August 2014
	// vars
	var self = this
	var s = self.settings
	var d = self.data
	// Handlebars
	var memberTemplate   = $(s.memberTemplate).html()
	var compiledTemplate = Handlebars.compile(memberTemplate)
	var listItemTemplate = $(s.listItemTemplate).html()
	var compiledItemTemplate = Handlebars.compile(listItemTemplate)
	// Initiate position vars
	var x = 100;
	var y = 0;
	// Get member data
	$.getJSON('/data/all_members.json')
	.done(function (data) {
		var members = data.items;
		if(filterList){
			var filteredMembers = []
			_(members).each(function (member) {
				var filterListIndex = _.indexOf(filterList, member.member_id)
				if(!!(filterListIndex>=0)){
					member.sortId = filterListIndex
					filteredMembers.push(member)
				}
			})
			members = filteredMembers
			// console.log(filterList)
			// console.log(members)
		}
		if(!options || options && !options.nolist) {
			// Create the sidelist
			var membersBySurname = _.sortBy(members, 'surname')
			_(membersBySurname).each(function (member) {
				var itemContext = member
				var itemHtml    = compiledItemTemplate(itemContext)
				$('.js_members_list').append(itemHtml)
			})
		}
		// Sort by paper to avoid long lines
		members = _.sortBy(members, 'sortId')
		// console.log(members)
		// Build each member

	}).done(function () {
		// app.connectMembers('0','120');
		var op = options
		// For each paper draw the connections
		_.each(papers, function(paper) {
			// For each collaborator
			paper.remaining_colab_ids = paper.collaborator_ids
			_.each(paper.remaining_colab_ids, function(id) {
				var ids = _.without(paper.remaining_colab_ids, id)
				// console.log(ids);
				_.each(ids, function (mid) {
					app.connectMembers(id,mid,paper, op);
					// console.log(paper.id);
				})
				paper.remaining_colab_ids = _.without(paper.remaining_colab_ids, id)
			})
			// app.connectMembers('0','120');
		})
		// BUG: multiple initiating...
		app.addEvents()
	});
}
app.showMemberPoints = function(options) {
	var s = app.settings
	var d = app.data
	var members = d.membersWithPapers.slice(0)
	var memberTemplate   = $(s.memberTemplate).html()
	var compiledTemplate = Handlebars.compile(memberTemplate)
	if (options && options.limit) {
		var filteredMembers = []
		_(members).each(function (member) {
			var filterListIndex = _.indexOf(options.limit, member.member_id)
			if(!!(filterListIndex>=0)){
				member.sortId = filterListIndex
				filteredMembers.push(member)
			}
		})
		members = filteredMembers
	}
	if (options && options.sort) {
		// Sort by paper to avoid long lines
		members = _.sortBy(members, 'sortId')
	}
	// Initiate position vars
	var x = 100;
	var y = 0;
    var colorArray = ["#b39686", "#b62f33", "#e9aeaa", "#540b05","#1b4298","#d9c2b4", "#151314", "#be766a", "#00336a", "#ffe4c4", "#bb7fd1", "#dd8808", "#7fffd4", "#333366", "#299868", "#01a9d4", "#f25047","#00336a","#86695a", "#cc443d", "#e16868", "#ffa500","#8BF470", "#8C6596","#B88C4F","#805213","#C9EB71","#628509","#2C0985","#E820DB","#0E7815","F5810C"];

	_(members).each(function (member) {
		if (!$('#'+member.member_id).length){
			// Create Member name initials
			member.member_initials = member.name.charAt(0) + '.' + member.surname.charAt(0)
			// Calculate horizontal and vertical positions
            colorString=colorArray[member.cluster_id]
            member.color=colorString;
            /* ---------------- *\
              zoom calculations
            \* ---------------- */
            member.pos_x = member.pos_x * 4
            member.pos_y = member.pos_y * 4
            member.pos_x = member.pos_x - 1450
            member.pos_y = member.pos_y - 750

            // member.pos_x = member.pos_x * 3
            // member.pos_y = member.pos_y * 3
            // member.pos_x = member.pos_x - 1000
            // member.pos_y = member.pos_y - 500
            /* ---------------- *\
              zoom calculations
            \* ---------------- */
            // console.log('member', member);
			var memberContext = member
			var memberHtml    = compiledTemplate(memberContext)
			// Place in DOM
			$('.js_draw_members').width(x-70).append(memberHtml)
			// console.log('placed: ' + member.member_id)
		}
	})
	app.addEvents()
}
app.connectCollaborators = function(options) {
	var d = app.data
	var p = d.papers
	var op = options
	papers = (options && options.papers)? options.papers : d.papers;
	// For each paper draw the connections
	_.each(papers, function(paper) {
		// For each collaborator
		paper.remaining_colab_ids = paper.collaborator_ids
		_.each(paper.remaining_colab_ids, function(id) {
			var ids = _.without(paper.remaining_colab_ids, id)
			_.each(ids, function (mid) {
				app.connectMembers(id, mid, paper, op)
			})
			paper.remaining_colab_ids = _.without(paper.remaining_colab_ids, id)
		})
	})
}
app.addEvents = function () {
	var d = app.data
	var p = d.papers
	var m = d.members
	if(!$('.js_gear-member-list__item').hasClass('js_item--clickable')) {
		$('.js_gear-member-list__item').click(function () {
			var memberId = parseInt($(this).find('.js_list-item__member__id').text())// * 1
			if (_.isUndefined(memberId) || _.isNull(memberId)) { return false }
			var $memberPoint = $('#' + memberId)
			$(".js_names_dropdown").removeClass('dropdown--open')
			setTimeout(function () {
				$memberPoint.addClass('point-focus')
				setTimeout(function () {
					$memberPoint.removeClass('point-focus')
				}, 1500)
			}, 500)
		})
		$('.js_gear-member-list__item').addClass('js_item--clickable')
	}
	$('.js_gear-member-point').tooltip()
}
app.showMembersRelatedTo = function (memberId) {
	var d = app.data
	var p = d.papers
	var m = d.members
	var t = d.tempMembers
	var r = d.remainingMemberIds

	var limitedMemberIds = []

	// Get Papers for member
	var memberPapers = app.getMemberPapers(memberId, p)
	// Each paper
	_.each(memberPapers, function (paper) {

		var collaborator_ids = _.without(paper.collaborator_ids, memberId, limitedMemberIds)
		// Get collaborator ids without current memberId any previously cached ids
		limitedMemberIds = _.union(limitedMemberIds, paper.collaborator_ids)

	})
	limitedMemberIds = _.unique(limitedMemberIds)

	// Remove any dupplicate ids
	// Get all related members for member
	app.showMemberPoints({limit: limitedMemberIds})

	// Connect points
	app.connectCollaborators({personalChart: true, baseId: memberId, limit: limitedMemberIds, papers: memberPapers})

	// Listen to point events
	app.addEvents()
}
app.showMembersList = function() {
	var s = app.settings
	var d = app.data
	var members = d.membersWithPapers
	var listItemTemplate = $(s.listItemTemplate).html()
	var compiledItemTemplate = Handlebars.compile(listItemTemplate)
	var membersBySurname = _.sortBy(members, 'surname')
	_(membersBySurname).each(function (member) {
		var itemContext = member
		var itemHtml    = compiledItemTemplate(itemContext)
		$('.js_members_list').append(itemHtml)
	})
}
app.showMembers = function() {
	console.log(app.data.papers)
}
app.clearChart = function() {
	$('.js_draw_members').html('')
}
app.fetchMembers = function () {
	var d = this.data
	var s = this.settings
	var deferred = $.Deferred()
	// GET Members
	// console.log('Fetch Members');
	$.get(s.urls.members)
	.done(function(data) {
		// STORE Members
		// console.log('Members fetched');
		d.members = data.items
		deferred.resolve('Members fetched')
	})
	.fail(function(resp, aaa) {
		deferred.reject('Could not fetch members')
		// console.log('Could not fetch members', resp, aaa);
	})

	return deferred.promise()
}
app.fetchPapers = function () {
	var d = this.data
	var s = this.settings
	var deferred = $.Deferred()
	// GET Papers
	$.get(s.urls.papers)
	.done(function(data) {
		// STORE Papers
		d.papers = data.papers
		deferred.resolve('Papers fetched')
	})
	.fail(function() {
		deferred.reject('Could not fetch papers')
	})

	return deferred.promise()
}
app.filterMembersWithPapers = function() {
	var self = this
	var s = self.settings
	var d = self.data
	var deferred = $.Deferred()

	var membersWithPapersIds = []
	d.membersWithPapers = []
	_.each(d.papers, function (paper) {
		_.each(paper.collaborator_ids, function (collaborator_id) {
			membersWithPapersIds.push(collaborator_id)
		})
	})
	membersWithPapersIds = _.unique(membersWithPapersIds)
	var i = 0
	_(membersWithPapersIds).each(function(collaboratorId) {
		var member = _.find(d.members, function(member){ return member.member_id === collaboratorId })
		if(member){
			member.sortId = i
			d.membersWithPapers.push(member)
			i++
		}
	})
	if (d.membersWithPapers.length) {
		deferred.resolve('Papers filtered')
	} else {
		deferred.reject('Could not filter papers')
	}
	return deferred.promise()
}
app.showLoader = function() {
	$('.js_draw_members').append('<div class="js_spinner spinner"><i class="spinner-part"/><i class="spinner-part"/><i class="spinner-part"/></div>')
}
app.hideLoader = function() {
	$('.js_spinner').remove();
}
app.init = function () {
	var d = app.data
	console.log('Welcome to Gear members chart!')
	// New
	var onDataFetched = $.when(app.fetchMembers(), app.fetchPapers())
	var onMembersFiltered = {}
	onDataFetched.done(function(data,location){
		app.filterMembersWithPapers()
		.done(function() {
			app.showMembersList()
			app.showMemberPoints({sort:true})
			app.connectCollaborators()
			app.addEvents()
		})
	})
	// Back to top
	$(".js_backtotop").click(function() {
		$("html, body").animate({ scrollTop: 0 }, "slow")
		return false
	})
	// Toggle sidebar
	$(".js_sidebar_col").hide()
	$(".js_toggle_sidebar").click(function() {
		if($(this).hasClass('toggle-sidebar--open')){
			$(this).removeClass('toggle-sidebar--open').attr("title", "Open sidebar")
			$(".js_chart_parent_col").removeClass("col-md-8 col-sm-7").addClass("col-md-12 col-sm-12")
			$(".js_sidebar_col").hide()
		} else {
			$(this).addClass('toggle-sidebar--open').attr("title", "Close sidebar")
			$(".js_sidebar_col").show()
			$(".js_chart_parent_col").removeClass("col-md-12 col-sm-12").addClass("col-md-8 col-sm-7")
		}
	})
	$(".js_toggle_names_dropdown").click(function() {
		var $namesPopover = $(".js_names_dropdown")
		if($namesPopover.hasClass("dropdown--open")) {
			$namesPopover.removeClass('dropdown--open')
		} else {
			$namesPopover.addClass('dropdown--open')
		}
	})
}

$(document).ready(function(){
	app.init()
})
