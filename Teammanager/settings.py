import os

INSTALLED_APPS = [
    
    'django.contrib.auth',  #Core authentication framework and its default models.
    'django.contrib.contenttypes',  #Django content type system (allows permissions to be associated with models).
    'django.contrib.admin',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfields',
    'Teammanager',
    
MIDDLEWARE = [
   
    'django.contrib.sessions.middleware.SessionMiddleware',  #Manages sessions across requests
    'django.contrib.auth.middleware.AuthenticationMiddleware',  #Associates users with requests using sessions.


DATABASES = {

    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}
