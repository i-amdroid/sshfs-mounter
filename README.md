SSHFS Mounter for macOS
=======================

<img src="https://github.com/i-amdroid/sshfs-mounter/blob/master/screenshot.png" width="782">

GUI for SSHFS command line interface.

Download
--------

Get latest version from [Releases](https://github.com/i-amdroid/sshfs-mounter/releases).

Requirements
------------

* SSHFS ([osxfuse.github.io](https://osxfuse.github.io/))

Install SSHFS with Homebrew:

    brew install sshfs 

Using
-----

Fill necessary fields and mount.

Required fields:

* Volume title
* Server
* Password or Key file
* Mount directory

Save connection properties if necessary.

Limitations
-----------

This app is just GUI constructor for execute command. Unfortunately, it can't interract with command line prompts.

* No required field checking or any other validation.
* There shouldn't be any interactive prompts, such as adding server to known hosts, password, etc.
* For using key auth is necessary to avoid enter passphrase (by keychain, keyring or ssh-agent) or it shouldn't be at all.
