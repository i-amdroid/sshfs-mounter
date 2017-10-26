window.$ = window.jQuery = require('jquery');

const settings = require('electron').remote.require('electron-settings');

// https://github.com/sindresorhus/fix-path
const fixPath = require('fix-path');
fixPath();

var exec = require('child_process').exec;
function execute(command, callback) {
  exec(command, function(error, stdout, stderr) {
    callback(stdout);
  });
};

function executeWithInfo(command, callback) {
  exec(command, function(error, stdout, stderr) {
    callback(error, stdout, stderr);
  });
};

// Getiing preferences from settings
function getPreferences() {
  return settings.get('preferences');
};
var preferences = getPreferences();

/*
// manual command execution
// for development
function cmdExec() {
  var cmd = $('#sm-input').val();
  execute(cmd, function(output) {
    var cmdout = $('#sm-output').val() + cmd + '\n' + output;
    $('#sm-output').val(cmdout);
  });
};
*/

var connection_settings_list = {
  title: 'Volume title',
  server: 'Server',
  port: 'Port',
  user: 'Username',
  password: 'Password',
  key: 'Key file',
  remote: 'Remote directory',
  mount: 'Mount directory'
};
// savepass: 'Save password',

function genConnectionsList() {
  $('#sm-con-list').empty();
  $.each(getConnections(), function(key, value) {
    $('#sm-con-list').append('<li id="' + key + '" tabindex="0">' + key + '</li>');
  });
  updateMountState();
}

function showConnection(connection_id) {
  $('#' + connection_id).addClass('is-active');
  $('#sm-con-list li:not(#'  + connection_id + ')').removeClass('is-active');
  clearProperties();
  showProperties(connection_id);
};

function checkMount(mountpoint, element) {
  // df is right way, but grep dont work in child_process
  // var cmd = 'df ' + mountpoint + ' | grep -q -f <(echo ' + mountpoint + ') && echo "mounted"';
  // used way just check directory for non emptiness
  var cmd = '[ "$(ls -A ' + mountpoint + ')" ] && echo "mounted"';
  execute(cmd, function(output) {
    if (output.trim() == 'mounted') {
      $(element).addClass("is-mounted");
    }
    else {
      $(element).removeClass("is-mounted");
    }
  });
};

function getConnections() {
  return settings.get('connections');
};

function getConnectionSettings(connection_id) {
  return settings.get('connections.' + connection_id);
};

function setConnectionSettings(connection_id, connection_settings) {
  settings.set('connections.' + connection_id, connection_settings, { prettify: true });
};

function rmConnectionSettings(connection_id) {
  settings.delete('connections.' + connection_id, { prettify: true });
};

function showProperties(connection_id) {
  var connection_settings = getConnectionSettings(connection_id);
  $.each(connection_settings, function(key, value) {
    $('#sm-' + key).val(value);
  });
  if (connection_settings['savepass']) {
    $('#sm-savepass').prop('checked', true);
  };
};

function checkConnectionExist(connection_id) {
  var match = false;
  $.each(getConnections(), function(key, value) {
    if(key ==  connection_id) {
      match = true;
      return true;
    };
  });
  return match;
};

function genNextID(connection_id) {
  var id = connection_id.split('-');
  var index = id[id.length-1];
  index = parseInt(index) + 1;
  id.pop();
  id.push(index);
  return id.join('-');
};

function createNewConnection(connection_id = 'server-1') {
  while (checkConnectionExist(connection_id)) {
    connection_id = genNextID(connection_id);
  };
  setConnectionSettings(connection_id, { title: connection_id });
  genConnectionsList();
  scrollConList();
  showConnection(connection_id);
};

function removeCurrentConnection() {
  if ($('#sm-con-list li.is-active').length) {
    var connection_id = $('#sm-con-list li.is-active')[0].id;
    rmConnectionSettings(connection_id);
    genConnectionsList();
    clearProperties();
  }
};

function clearProperties() {
  $.each(connection_settings_list, function(key, value) {
    $('#sm-' + key).val('');
    $('#sm-savepass').prop('checked', false);
  });
};

function saveConnectionSettings() {
  var connection_id = '';
  var connection_settings = getProperties();
  // Check selected
  if ($('#sm-con-list li.is-active').length) {
    connection_id = $('#sm-con-list li.is-active')[0].id;
    // Check change id
    if (connection_id !== connection_settings['title']) {
      rmConnectionSettings(connection_id);
      connection_id = connection_settings['title'];
    }; 
  } else {
    connection_id = connection_settings['title'];
  };
  setConnectionSettings(connection_id, connection_settings);
  genConnectionsList();
  showConnection(connection_id);
};

function generateMountCommand(connection_settings) {
  var cmd = [];
  var options = preferences['options'].slice();
  if (connection_settings['password']) {
    cmd.push('echo ' + connection_settings['password'] + ' |');
    options.push('password_stdin');
  };
  if (connection_settings['key']) {
    options.push('IdentityFile=' + connection_settings['key']);
  };
  options.unshift('volname=' + connection_settings['title']);
  cmd.push(preferences['mount_cmd']);
  if (connection_settings['user']) {
    cmd.push(connection_settings['user'] + '@' + connection_settings['server'] + ':' + connection_settings['remote']);
  } else {
    cmd.push(connection_settings['server'] + ':' + connection_settings['remote']);
  };
  cmd.push(connection_settings['mount']);
  cmd.push('-o ' + options.join(','));
  if (connection_settings['port']) {
    cmd.push('-p ' + connection_settings['port']);
  };
  return cmd.join(' ');
};

function generateUnMountCommand(connection_settings) {
  return preferences['unmount_cmd'] + ' ' + connection_settings['mount'];
};

function getProperties() {
  var connection_settings = {};
  $.each(connection_settings_list, function(key, value) {
    connection_settings[key] = $('#sm-' + key).val();
  });
  var savepass = $('#sm-savepass').is(':checked');
  if (savepass) {
    connection_settings['savepass'] = true;
  } else {
    connection_settings['savepass'] = false;
    connection_settings['password'] = '';
  };
  return connection_settings;
};

function mount() {
  var cmd = generateMountCommand(getProperties());
  var escaped_cmd = cmd;
  if (cmd.substring(0, 4) == 'echo') {
    var password = cmd.substring(5, cmd.lastIndexOf(' |'));
    escaped_cmd = cmd.replace(password, '[password]');
  };
  setOutput(escaped_cmd + '\n');
  executeWithInfo(cmd, function(error, stdout, stderr) {
    if (error == null) {
      setOutput('Mounted\n');
    } else {
      setOutput(stderr);
    };
    // setOutput(output);
    updateMountState();
  });
};

function unMount() {
  var cmd = generateUnMountCommand(getProperties());
  setOutput(cmd + '\n');
  executeWithInfo(cmd, function(error, stdout, stderr) {
    if (error == null) {
      setOutput('Unmounted\n');
    } else {
      setOutput(stderr);
    };
    // setOutput(output);
    updateMountState();
  });
};

function updateMountState() {
  $.each(getConnections(), function(key, value) {
    var mountpoint = value['mount'];
    var element = '#' + key;
    checkMount(mountpoint, element);
  });
};

function scrollOutput() {
  $('#sm-output').scrollTop($('#sm-output')[0].scrollHeight);
};

function setOutput(message) {
  $('#sm-output').val($('#sm-output').val() + message);
  scrollOutput();
};


function scrollConList() {
  $('#sm-con-list').scrollTop($('#sm-con-list')[0].scrollHeight);
};

$(document).ready(function() {

  // print sshfs version in log
  execute('sshfs --version', function(output) {
    setOutput(output);
  });

  //$('body').addClass('ui-' + preferences['theme']);
  // ui-darwin hardcoded in index.html for now
  $('body').addClass('ui-loaded');

  genConnectionsList();
  
  // event listeners

  // delegated event
  $('#sm-con-list').on('mousedown', 'li', function() {
    showConnection(this.id);
  });

  $('#sm-add-con').click(function() {
    createNewConnection();
  });

  $('#sm-rm-com').click(function() {
    removeCurrentConnection();
  });

  $('#sm-con-save').click(function() {
    saveConnectionSettings();
  });

  $('#sm-con-mount').click(function() {
    mount();
  });

  $('#sm-con-unmount').click(function() {
    unMount();
  });

  /*
  // for development
  $('#sm-exec-btn').click(function() {
    cmdExec();
  });
  */  

});
