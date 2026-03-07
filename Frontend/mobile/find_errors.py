import subprocess
out = subprocess.run(['dart', 'analyze', 'lib/screens/chat_screen.dart', 'lib/screens/user_list_screen.dart'], capture_output=True, text=True, cwd=r'c:\FYP_BCSS\SentriZK-InternalChat\Frontend\mobile', shell=True)
errors = [line for line in out.stdout.split('\n') if ('error' in line.lower() or 'Error' in line)]
for msg in errors[:30]:
    print(msg)
    
if not errors and out.stderr:
    errors_err = [line for line in out.stderr.split('\n') if ('error' in line.lower() or 'Error' in line)]
    for msg in errors_err[:30]:
        print(msg)
