const Desklet = imports.ui.desklet;
const Extension = imports.ui.extension;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Settings = imports.ui.settings;
const Tooltips = imports.ui.tooltips;

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const GtkClutter = imports.gi.GtkClutter;
const Pango = imports.gi.Pango;
const St = imports.gi.St;
const Vte = imports.gi.Vte;

const Util = imports.misc.util;
const Lang = imports.lang;
const Mainloop = imports.mainloop;

const POPUP_MENU_ICON_SIZE = 24;
const ERROR_LOG_REFRESH_TIMEOUT = 1;

const SETTINGS_PAGES = [
    { title: "Applet Settings",      page: "applets" },
    { title: "Desklet Settings",     page: "desklets" },
    { title: "Extension Settings",   page: "extensions" },
    { title: "General Settings",     page: "general" },
    { title: "Menu Settings",        page: "menu" },
    { title: "Panel Settings",       page: "panel" },
    { title: "Theme Settings",       page: "themes" }
]


//function Terminal() {
//    this._init();
//}
//
//Terminal.prototype = {
//    _init: function() {
//        
//        this.actor = new St.BoxLayout({ vertical: true });
//        
//        this.output = new St.Label();
//        
//        let scrollBox = new St.ScrollView();
//        let textBox = new St.BoxLayout();
//        textBox.add_actor(this.output);
//        scrollBox.add_actor(textBox);
//        this.actor.add_actor(scrollBox);
//        
//        let paddingBox = new St.Bin();
//        this.actor.add_actor(paddingBox, { expand: true });
//        
//        this.input = new St.Entry({ style_class: "devtools-terminalEntry" });
//        this.actor.add_actor(this.input);
//        
//        this.input.connect("enter_event", Lang.bind(this, this._run_input));
//        
//    },
//    
//    _run_input: function() {
//        
//        let input = this.input.get_text();
//        if ( input == "" ) return;
//        
//        let [success, argv] = GLib.shell_parse_argv(input);
//        
//        let pid = {};
//        let flags = GLib.SpawnFlags.SEARCH_PATH
//        GLib.spawn_async_with_pipes(null, argv, null, flags, null, null, pid);
//        
//        //add output handling with pipes
//        
//    }
//}


function GenericInterface() {
    this._init();
}

GenericInterface.prototype = {
    name: _("Untitled"),
    
    _init: function() {
        
        //create panel
        this.panel = new St.BoxLayout({ style_class: "devtools-panel", vertical: true });
        this.panel.hide();
        
        //generate tab
        this.tab = new St.Button({ label: this.name, style_class: "devtools-tab" });
        
    },
    
    setSelect: function(select) {
        if ( select ) {
            this.panel.show();
            this.tab.add_style_pseudo_class('selected');
        }
        else {
            this.panel.hide();
            this.tab.remove_style_pseudo_class('selected');
        }
    },
    
    _formatTime: function(d){
        function pad(n) { return n < 10 ? '0' + n : n; }
        return (d.getMonth()+1)+'/'
            + pad(d.getDate())+' '
            + (d.getHours())+':'
            + pad(d.getMinutes())+':'
            + pad(d.getSeconds())+'  ';
    }
}


//function TerminalInterface(parent) {
//    this._init(parent);
//}
//
//TerminalInterface.prototype = {
//    __proto__: GenericInterface.prototype,
//    
//    name: _("Run"),
//    
//    _init: function(parent) {
//        
//        try {
//        GenericInterface.prototype._init.call(this);
//        
//        let terminal = new Terminal();
//        this.panel.add_actor(terminal.actor);
//            
//        } catch(e) {
//            global.logError(e);
//        }
//        
//    }
//}


function CinnamonLogInterface(parent) {
    this._init(parent);
}

CinnamonLogInterface.prototype = {
    __proto__: GenericInterface.prototype,
    
    name: _("Cinnamon Log"),
    
    _init: function(parent) {
        
        GenericInterface.prototype._init.call(this);
        
        this.scrollBox = new St.ScrollView();
        
        //content text
        this.contentText = new St.Label();
        this.contentText.set_clip_to_allocation(false);
        this.contentText.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        this.contentText.clutter_text.line_wrap = true;
        let textBox = new St.BoxLayout();
        textBox.add_actor(this.contentText);
        this.scrollBox.add_actor(textBox);
        this.panel.add_actor(this.scrollBox);
        
        let paddingBox = new St.Bin();
        this.panel.add(paddingBox, { expand: true });
        
        //refresh button
        let buttonContent = new St.BoxLayout({ vertical: false, style_class: "devtools-refreshBox" });
        let refreshIcon = new St.Icon({ icon_type: St.IconType.SYMBOLIC, icon_size: 20, icon_name: "view-refresh" });
        buttonContent.add_actor(refreshIcon);
        let refreshLabelBin = new St.Bin();
        buttonContent.add_actor(refreshLabelBin);
        let refreshLabel = new St.Label({ text: _("Reload") });
        refreshLabelBin.add_actor(refreshLabel);
        let refreshButton = new St.Button({ "toggle-mode": true });
        refreshButton.set_child(buttonContent);
        let buttonArea = new St.BoxLayout({ vertical: false });
        buttonArea.add_actor(refreshButton);
        this.panel.add_actor(buttonArea);
        refreshButton.connect("clicked", Lang.bind(this, this.getText));
        
        this.getText();
        this.connectToLgDBus();
        
    },
    
    connectToLgDBus: function() {
        let proxy = new Gio.DBusProxy({ g_bus_type: Gio.BusType.SESSION,
                                        g_flags: Gio.DBusProxyFlags.NONE,
                                        g_interface_info: null,
                                        g_name: "org.Cinnamon.LookingGlass",
                                        g_object_path: "/org/Cinnamon/LookingGlass",
                                        g_interface_name: "org.Cinnamon.LookingGlass" });
        
        //let proxy = new Gio.DBusProxy.for_bus_sync(Gio.BusType.SESSION, Gio.DBusProxyFlags.NONE, null, "org.Cinnamon.LookingGlass", "/org/Cinnamon/LookingGlass", "org.Cinnamon.LookingGlass", null);
        proxy.connect("g-signal", Lang.bind(this, function(proxy, senderName, signalName, params) {
                global.logError("testing");
            if ( senderName == "LogUpdate" ) {
                this.getText();
            }
        }));
    },
    
    getText: function() {
        let stack = Main._errorLogStack;
        
        let text = "";
        for ( let i = 0; i < stack.length; i++) {
            let logItem = stack[i];
            text += this._formatTime(new Date(parseInt(logItem.timestamp))) + logItem.category + ':  ' + logItem.message + '\n';
        }
        if ( this.contentText.text != text ) {
            this.contentText.text = text;
            let adjustment = this.scrollBox.get_vscroll_bar().get_adjustment();
            adjustment.value = this.contentText.height - adjustment.page_size;
            
        }
        Mainloop.timeout_add_seconds(ERROR_LOG_REFRESH_TIMEOUT, Lang.bind(this, this.getText));
    }
}


function ExtensionInterface(parent, name, info) {
    this._init(parent, name, info);
}

ExtensionInterface.prototype = {
    __proto__: GenericInterface.prototype,
    
    _init: function(parent, name, info) {
        try {
            
            this.name = name;
            this.info = info;
            GenericInterface.prototype._init.call(this);
            
            let scrollBox = new St.ScrollView();
            this.panel.add_actor(scrollBox);
            
            this.extensionBox = new St.BoxLayout({ vertical: true });
            scrollBox.add_actor(this.extensionBox);
            
            this.info.connect("extension-loaded", Lang.bind(this, this.reload));
            this.info.connect("extension-unloaded", Lang.bind(this, this.reload));
            
            this.reload();
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    reload: function() {
        try {
            this.extensionBox.destroy_all_children();
            
            for ( let uuid in Extension.meta ) {
                let meta = Extension.meta[uuid];
                if ( !meta.name ) continue;
                if ( !Extension.objects[uuid] ) continue;
                if ( Extension.objects[uuid].type.name != this.info.name ) continue;
                
                let extension = new St.BoxLayout({ vertical: true });
                let name = new St.Label({ text: meta.name });
                extension.add_actor(name);
                
                let description = new St.Label({ text: meta.description });
                extension.add_actor(description);
                
                let reload = new St.Button({ x_align: St.Align.START });
                extension.add_actor(reload);
                let reloadBox = new St.BoxLayout();
                reload.set_child(reloadBox);
                reload.connect("clicked", Lang.bind(this, function() {
                    Extension.unloadExtension(meta.uuid);
                    Extension.loadExtension(meta.uuid, this.info);
                }));
                
                let reloadIcon = new St.Icon({ icon_type: St.IconType.SYMBOLIC, icon_size: "20", icon_name: "view-refresh" });
                reloadBox.add_actor(reloadIcon);
                let reloadLabelBin = new St.Bin();
                reloadBox.add_actor(reloadLabelBin);
                let reloadLabel = new St.Label({ text: _("Reload Code") });
                reloadLabelBin.add_actor(reloadLabel);
                
                this.extensionBox.add_actor(extension);
                
                let separator = new PopupMenu.PopupSeparatorMenuItem();
                this.extensionBox.add_actor(separator.actor);
            }
            
        } catch(e) {
            global.logError(e);
        }
    }
}


let interfaces = [
    new CinnamonLogInterface(),
    //new TerminalInterface(),
    new ExtensionInterface(null, "Applets", Extension.Type.APPLET),
    new ExtensionInterface(null, "Desklets", Extension.Type.DESKLET),
    new ExtensionInterface(null, "Extensions", Extension.Type.EXTENSION),
];


function Menu(icon, tooltip, styleClass) {
    this._init(icon, tooltip, styleClass);
}

Menu.prototype = {
    _init: function(icon, tooltip, styleClass) {
        try {
            
            this.actor = new St.Button({ style_class: styleClass });
            this.actor.set_child(icon);
            new Tooltips.Tooltip(this.actor, tooltip);
            
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menu = new PopupMenu.PopupMenu(this.actor, 0.0, St.Side.TOP, 0);
            this.menuManager.addMenu(this.menu);
            Main.uiGroup.add_actor(this.menu.actor);
            this.menu.actor.hide();
            
            this.actor.connect("clicked", Lang.bind(this, this.activate));
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    activate: function() {
        this.menu.toggle();
    },
    
    addMenuItem: function(title, callback, icon) {
        let menuItem = new PopupMenu.PopupBaseMenuItem();
        if ( icon ) menuItem.addActor(icon);
        let label = new St.Label({ text: title });
        menuItem.addActor(label);
        menuItem.connect("activate", callback);
        this.menu.addMenuItem(menuItem);
    },
    
    addSeparator: function() {
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    }
}


function myDesklet(metadata, desklet_id) {
    this._init(metadata, desklet_id);
}

myDesklet.prototype = {
    __proto__: Desklet.Desklet.prototype,
    
    _init: function(metadata, desklet_id) {
        try {
            
            Desklet.Desklet.prototype._init.call(this, metadata);
            
            this.setHeader(_("Tools"));
            
            this.settings = new Settings.DeskletSettings(this, metadata["uuid"], desklet_id);
            this.settings.bindProperty(Settings.BindingDirection.IN, "lgOpen", "lgOpen", function() {});
            this.settings.bindProperty(Settings.BindingDirection.IN, "collapsedStartState", "collapsedStartState", function() {});
            this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL, "collapsed", "collapsed", this.setHideState);
            
            let mainBox = new St.BoxLayout({ vertical: true });
            this.setContent(mainBox);
            let buttonArea = new St.BoxLayout({ vertical: false });
            
            //collapse button
            this.collapseButton = new St.Button({ style_class: "devtools-panelButton" });
            this.collapseIcon = new St.Icon({ icon_type: St.IconType.SYMBOLIC, icon_size: "20" });
            this.collapseButton.set_child(this.collapseIcon);
            buttonArea.add_actor(this.collapseButton);
            this.collapseButton.connect("clicked", Lang.bind(this, this.toggleCollapse));
            this.collapseTooltip = new Tooltips.Tooltip(this.collapseButton);
            
            if ( this.collapsedStartState == 1 ) this.collapsed = false;
            else if ( this.collapsedStartState == 2 ) this.collapsed = true;
            
            let paddingBox = new St.Bin();
            buttonArea.add(paddingBox, { expand: true });
            
            //cinnamon settings menu
            let csMenuIcon = new St.Icon({ icon_type: St.IconType.SYMBOLIC, icon_size: "20", icon_name: "system-run" });
            let csMenu = new Menu(csMenuIcon, _("Cinnamon Settings"), "devtools-panelButton");
            buttonArea.add_actor(csMenu.actor);
            this._populateSettingsMenu(csMenu);
            
            //open looking glass button
            let lgButton = new St.Button({ style_class: "devtools-panelButton" });
            let lgIcon = new St.Icon({ icon_type: St.IconType.SYMBOLIC, icon_size: "20", icon_name: "edit-find" });
            lgButton.set_child(lgIcon);
            buttonArea.add_actor(lgButton);
            lgButton.connect("clicked", Lang.bind(this, this.launchLookingGlass));
            new Tooltips.Tooltip(lgButton, _("Open Looking Glass"));
            
            //restart button
            let restartButton = new St.Button({ style_class: "devtools-panelButton" });
            let restartIcon = new St.Icon({ icon_type: St.IconType.SYMBOLIC, icon_size: "20", icon_name: "view-refresh" });
            restartButton.set_child(restartIcon);
            buttonArea.add_actor(restartButton);
            restartButton.connect("clicked", Lang.bind(this, function() {
                global.reexec_self();
            }));
            new Tooltips.Tooltip(restartButton, _("Restart Cinnamon"));
            
            mainBox.add_actor(buttonArea);
            
            this.contentArea = new St.BoxLayout({ vertical: true });
            mainBox.add_actor(this.contentArea);
            
            //load tabs
            this.tabBox = new St.BoxLayout({ style_class: "devtools-tabBox", vertical: false });
            for ( let i in interfaces ) {
                this.contentArea.add_actor(interfaces[i].panel);
                let tab = interfaces[i].tab;
                this.tabBox.add_actor(tab);
                tab.connect("clicked", Lang.bind(this, function (){ this.selectTab(tab) }));
            }
            
            this.setHideState();
            this.contentArea.add_actor(this.tabBox);
            
            this.selectIndex(0);
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    _populateSettingsMenu: function(menu) {
        menu.addMenuItem("All Settings",
                         function() { Util.spawnCommandLine("cinnamon-settings"); },
                         new St.Icon({ icon_name: "preferences-system", icon_size: POPUP_MENU_ICON_SIZE, icon_type: St.IconType.FULLCOLOR }));
        
        menu.addSeparator();
        
        for ( let i = 0; i < SETTINGS_PAGES.length; i++ ) {
            let command = "cinnamon-settings " + SETTINGS_PAGES[i].page;
            menu.addMenuItem(SETTINGS_PAGES[i].title,
                             function() { Util.spawnCommandLine(command); },
                             new St.Icon({ icon_name: SETTINGS_PAGES[i].page, icon_size: POPUP_MENU_ICON_SIZE, icon_type: St.IconType.FULLCOLOR }));
        }
    },
    
    launchLookingGlass: function() {
        if ( this.lgOpen ) {
            Util.spawnCommandLine("cinnamon-looking-glass");
        }
        else {
            Main.createLookingGlass().open();
        }
        
    },
    
    selectTab: function(tab) {
        try {
            
        for ( let i in interfaces ) {
            if ( interfaces[i].tab == tab ) interfaces[i].setSelect(true);
            else interfaces[i].setSelect(false);
        }
        } catch(e) {
            global.logError(e);
        }
    },
    
    selectIndex: function(index) {
        for ( let i in interfaces ) {
            if ( i == index ) interfaces[i].setSelect(true);
            else interfaces[i].setSelect(false);
        }
    },
    
    setHideState: function(event) {
        if ( this.collapsed ) {
            this.collapseIcon.icon_name = "list-add";
            this.collapseTooltip.set_text(_("Expand"));
            this.contentArea.hide();
        }
        else {
            this.collapseIcon.icon_name = "list-remove";
            this.collapseTooltip.set_text(_("Collapse"));
            this.contentArea.show();
        }
    },
    
    toggleCollapse: function() {
        this.collapsed = !this.collapsed;
        this.setHideState();
    }
}


function main(metadata, desklet_id) {
    let desklet = new myDesklet(metadata, desklet_id);
    return desklet;
}