from datetime import datetime

from fabric.api import env
from fabric.colors import yellow
from fabric.context_managers import cd, shell_env
from fabric.operations import run
from fabric.contrib.files import exists


GIT_REPO = {
    'url': 'https://github.com/m4droid/TransantiagoScanner.git',
    'name': 'TransantiagoScanner'
}

DEPLOY_TIMESTAMP = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def production():
    env.hosts = ['www.cadcc.cl']
    env.user = 'tscanner'
    env.branch = 'master'
    env.home = '/home/{0:s}'.format(env.user)
    env.python_env = '{0:s}/pyenv'.format(env.home)


def deploy():
    prepare_environment()
    repo_update()
    repo_activate_version()
    npm_install()
    bower_install()
    set_config_file()
    grunt_build()


def prepare_environment():
    print(yellow('\nPreparing environment'))
    with shell_env(HOME=env.home), cd(env.home):
        run('mkdir -p repos dists')


def repo_update():
    print(yellow('\nUpdate repository'))
    with shell_env(HOME=env.home), cd('{0:s}/repos'.format(env.home)):
        run(
            '[ ! -d {name:s} ] && git clone {url:s} || (cd {name:s} && git pull)'.format(**GIT_REPO),
        )


def repo_activate_version():
    print(yellow('\nActivating repository version'))
    with shell_env(HOME=env.home), cd('{0:s}/repos/{1:s}'.format(env.home, GIT_REPO['name'])):
        run(
            'git checkout {0:s}'.format(env.branch),
        )


def npm_install():
    print(yellow('\nInstalling NPM dependencies'))
    with shell_env(HOME=env.home), cd('{0:s}/repos/{1:s}'.format(env.home, GIT_REPO['name'])):
        run('npm install')


def bower_install():
    print(yellow('\nInstalling Bower dependencies'))
    with shell_env(HOME=env.home), cd('{0:s}/repos/{1:s}'.format(env.home, GIT_REPO['name'])):
        run('bower --config.interactive=false cache clean')
        run('bower --config.interactive=false install')


def set_config_file():
    print(yellow('\nSetting config file'))
    with shell_env(HOME=env.home), cd('{0:s}/repos/{1:s}'.format(env.home, GIT_REPO['name'])):
        if not exists('app/scripts/configs/config.js'):
            run('cp app/scripts/configs/config.js{.default,}')


def grunt_build():
    print(yellow('\nBuilding project'))
    with shell_env(HOME=env.home), cd('{0:s}/repos/{1:s}'.format(env.home, GIT_REPO['name'])):
        run('grunt build')
        run('mv dist ~/dists/{0:s}'.format(DEPLOY_TIMESTAMP))
        run('rm -f ~/dists/current && ln -s ~/dists/{0:s} ~/dists/current'.format(DEPLOY_TIMESTAMP))
