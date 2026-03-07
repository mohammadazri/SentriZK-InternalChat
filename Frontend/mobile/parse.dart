import 'dart:convert';
import 'dart:io';

void main() async {
  final content = await File('analyze.json').readAsString();
  final data = json.decode(content);
  for (var diag in data['diagnostics']) {
    if (diag['severity'] == 'ERROR') {
      print('ERROR: ${diag['location']['file']}:${diag['location']['startLine']}:${diag['location']['startColumn']} - ${diag['problemMessage']}');
    }
  }
}
