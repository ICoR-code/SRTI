package mainServer;

import java.awt.Color;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.GridLayout;
import java.awt.Rectangle;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.AdjustmentEvent;
import java.awt.event.AdjustmentListener;
import java.io.FileWriter;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;

import javax.swing.BorderFactory;
import javax.swing.DefaultListCellRenderer;
import javax.swing.JButton;
import javax.swing.JCheckBox;

/*
 *  ExampleDebugGUI.java
 * 
 * - This class is an additional optional GUI interface, usable by both the Server and/or the Client.
 * - This GUI would display a window that shows live debug output as they occur during runtime. This is a more
 * 		intuitive method of debugging than relying on reading through a large debug file AFTER the execution is finished.
 * - Unlike ExampleServerGUI.java, this GUI is not directly connected to the SRTI like a simulation, but
 * 		is instead a class used directly by "Version.java".
 * */

import javax.swing.JFrame;
import javax.swing.JList;
import javax.swing.JPanel;
import javax.swing.JScrollBar;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.JTextPane;
import javax.swing.SwingUtilities;

import mainServer.ExampleServerGUI.ListAppSelectionHandler;
import mainServer.ExampleServerGUI.ListMessageHistorySelectionHandler;
import mainServer.ExampleServerGUI.ListMessageSelectionHandler;

public class ExampleDebugGUI extends JFrame {

	
	public ExampleDebugGUI() {
		
	}
	
	boolean isPaused = false;
	int historyIndex = 0;
	ArrayList<String> debugHistory = new ArrayList<String>();
	ArrayList<String> debugOutput = new ArrayList<String>();
	
	String filterIn = "";
	String filterOut = "";
	String highlightBlue = "";
	String highlightRed = "";
	
	public void UpdateText(String debugLine) {
		String addLine = "" + String.format("%04d", debugOutput.size()) + "            " + debugLine;
		debugHistory.add(addLine);
		if (isPaused == false) {
			for (int i = historyIndex - 1; i < debugHistory.size(); i++) {
				debugOutput.add(addLine);
			}
			historyIndex = debugHistory.size();
		} else {
			
		}
		
		SwingUtilities.invokeLater(new Runnable() {
			@Override
			public void run() {
				UpdateTextView();
				//debugGUI.UpdateText(System.currentTimeMillis() + " \t" + outputLine + "\n");
			}
		});
	}
	
	public void UpdateText() {
		SwingUtilities.invokeLater(new Runnable() {
			@Override
			public void run() {
				UpdateTextView();
				//debugGUI.UpdateText(System.currentTimeMillis() + " \t" + outputLine + "\n");
			}
		});
	}
	
	public void UpdateTextView() {
		// first, filter out if necessary
		String[] listApps_items_string = FilterTextView((String[]) (debugOutput.toArray(new String[debugOutput.size()])));
		
		if (listApps_items_string == null) {
			String [] listAppsEmpty = new String[0];
			listAppsEmpty[0] = "";
			listApps_list.setListData(listAppsEmpty);
			return;
		}
		
		listApps_list.setListData(listApps_items_string);
	}
	
	public String[] FilterTextView(String [] originalText) {
		
		
		ArrayList<String> workWithText = new ArrayList<String>();
		for (int i = 0; i < originalText.length; i++) {
			workWithText.add(originalText[i]);
		}
		
		if (filterIn.compareTo("") != 0) {
			// keep lines if they contain certain words: "||" means OR, allows multiple words
			String filterInEdit = filterIn;
			boolean filterInMore = true;
			ArrayList<String> filterInWords = new ArrayList<String>();
			while (filterInMore == true) {
				int endIndex = filterInEdit.indexOf("||");
				if (endIndex == -1) {
					filterInWords.add(filterInEdit);
					filterInMore = false;
				} else {
					filterInWords.add(filterInEdit.substring(0, endIndex));
					filterInEdit = filterInEdit.substring(endIndex + 2, filterInEdit.length());
				}
			}
			for (Iterator<String> iterator = workWithText.iterator(); iterator.hasNext();) {
				String word = iterator.next();
				boolean keepWord = false;
				for (int i = 0; i < filterInWords.size(); i++) {
					if (word.contains(filterInWords.get(i)) == true) {
						keepWord = true;
					}
				}
				if (keepWord == false) {
					iterator.remove();
				}
			}
		}
		
		if (filterOut.compareTo("") != 0) {
			// keep lines if they contain certain words: "||" means OR, allows multiple words
			String filterInEdit = filterOut;
			boolean filterInMore = true;
			ArrayList<String> filterInWords = new ArrayList<String>();
			while (filterInMore == true) {
				int endIndex = filterInEdit.indexOf("||");
				if (endIndex == -1) {
					filterInWords.add(filterInEdit);
					filterInMore = false;
				} else {
					filterInWords.add(filterInEdit.substring(0, endIndex));
					filterInEdit = filterInEdit.substring(endIndex + 2, filterInEdit.length());
				}
			}
			for (Iterator<String> iterator = workWithText.iterator(); iterator.hasNext();) {
				String word = iterator.next();
				boolean keepWord = true;
				for (int i = 0; i < filterInWords.size(); i++) {
					if (word.contains(filterInWords.get(i)) == true) {
						keepWord = false;
					}
				}
				if (keepWord == false) {
					iterator.remove();
				}
			}
		}
		String[] returnText = (String[])workWithText.toArray(new String[workWithText.size()]);
		
		return returnText;
	}
	
	JPanel main_panel;
	JList listApps_list;
	JScrollPane listApps_scrollpane;
	
	// initial setting up of GUI panel using Swing api
	public void setupPanel() {
		int width = 900;
		int height = 700;
		
		main_panel = new JPanel();
		
		GridBagLayout layout = new GridBagLayout();
		main_panel.setLayout(layout);
		GridBagConstraints gbc = new GridBagConstraints();
		gbc.fill = GridBagConstraints.HORIZONTAL;
		
		for (int i = 0; i < 8; i++) {
			gbc.gridx = i;
			gbc.gridy = 0;
			gbc.gridwidth = 1;
			JTextArea j00 = new JTextArea(" ");
			j00.setEditable(false);
			main_panel.add(j00, gbc);
		}
		
		gbc.gridx = 0;
		gbc.gridy = 1;
		gbc.gridwidth = 3;
		JTextArea j01 = new JTextArea("DebugGUI_20180620140001");
		j01.setEditable(false);
		j01.setPreferredSize(new Dimension(250,30));
		main_panel.add(j01, gbc);
		// ----------------
		gbc.gridx = 3;
		gbc.gridy = 1;
		gbc.gridwidth = 1;
		JButton j02 = new JButton("CLEAR LOG");
		j02.setPreferredSize(new Dimension(100,30));
		main_panel.add(j02, gbc);
		// -----------------
		gbc.gridx = 4;
		gbc.gridy = 1;
		JButton j03 = new JButton("RESET SEL");
		j03.setPreferredSize(new Dimension(100,30));
		main_panel.add(j03, gbc);
		// -----------------
		gbc.gridx = 5;
		gbc.gridy = 1;
		final JButton j04 = new JButton("PAUSE");
		j04.setPreferredSize(new Dimension(100,30));
		if (isPaused == true) {
			j04.setEnabled(false);
		}
		main_panel.add(j04, gbc);
		// -----------------
		final JButton j05 = new JButton("RESUME");
		gbc.gridx = 6;
		gbc.gridy = 1;
		j05.setPreferredSize(new Dimension(100,30));
		if (isPaused == false) {
			j05.setEnabled(false);
		}
		main_panel.add(j05, gbc);
		// -----------------
		gbc.gridx = 7;
		gbc.gridy = 1;
		JButton j06 = new JButton("EXPORT");
		j06.setPreferredSize(new Dimension(100,30));
		main_panel.add(j06, gbc);
		// ----------------
		for (int i = 0; i < 8; i++) {
			gbc.gridx = i;
			gbc.gridy = 2;
			gbc.gridwidth = 1;
			JTextArea j00 = new JTextArea(" ");
			j00.setEditable(false);
			main_panel.add(j00, gbc);
		}
		// -----------------
		gbc.gridx = 0;
		gbc.gridy = 3;
		gbc.fill = GridBagConstraints.HORIZONTAL;
		gbc.gridwidth = 2;
		JTextArea j07 = new JTextArea("HIGHLIGHT(BLUE)");
		j07.setEditable(false);
		j07.setPreferredSize(new Dimension(180,30));
		main_panel.add(j07, gbc);
		// ------------------
		gbc.gridx = 2;
		gbc.gridy = 3;
		gbc.fill = GridBagConstraints.HORIZONTAL;
		gbc.gridwidth = 1;
		final JCheckBox j08 = new JCheckBox("SET");
		j08.setPreferredSize(new Dimension(70,30));
		main_panel.add(j08, gbc);
		// -------------------
		gbc.gridx = 3;
		gbc.gridy = 3;
		gbc.fill = GridBagConstraints.HORIZONTAL;
		final JTextField j09 = new JTextField("");
		gbc.gridwidth = 5;
		j09.setPreferredSize(new Dimension(400,30));
		main_panel.add(j09, gbc);
		// -----------------
		gbc.gridx = 0;
		gbc.gridy = 4;
		gbc.fill = GridBagConstraints.HORIZONTAL;
		gbc.gridwidth = 2;
		JTextArea j10 = new JTextArea("HIGHLIGHT(RED)");
		j10.setEditable(false);
		j10.setPreferredSize(new Dimension(180,30));
		main_panel.add(j10, gbc);
		// ------------------
		gbc.gridx = 2;
		gbc.gridy = 4;
		gbc.fill = GridBagConstraints.HORIZONTAL;
		gbc.gridwidth = 1;
		final JCheckBox j11 = new JCheckBox("SET");
		j11.setPreferredSize(new Dimension(70,30));
		main_panel.add(j11, gbc);
		// -------------------
		gbc.gridx = 3;
		gbc.gridy = 4;
		gbc.fill = GridBagConstraints.HORIZONTAL;
		gbc.gridwidth = 5;
		final JTextField j12 = new JTextField("");
		j12.setPreferredSize(new Dimension(400,30));
		main_panel.add(j12, gbc);
		// -----------------
		gbc.gridx = 0;
		gbc.gridy = 5;
		gbc.fill = GridBagConstraints.HORIZONTAL;
		gbc.gridwidth = 2;
		JTextArea j13 = new JTextArea("FILTER(KEEP)");
		j13.setEditable(false);
		j13.setPreferredSize(new Dimension(180,30));
		main_panel.add(j13, gbc);
		// ------------------
		gbc.gridx = 2;
		gbc.gridy = 5;
		gbc.fill = GridBagConstraints.HORIZONTAL;
		gbc.gridwidth = 1;
		final JCheckBox j14 = new JCheckBox("SET");
		j14.setPreferredSize(new Dimension(70,30));
		main_panel.add(j14, gbc);
		// -------------------
		gbc.gridx = 3;
		gbc.gridy = 5;
		gbc.fill = GridBagConstraints.HORIZONTAL;
		gbc.gridwidth = 5;
		final JTextField j15 = new JTextField("");
		j15.setPreferredSize(new Dimension(400,30));
		main_panel.add(j15, gbc);
		// -----------------
		gbc.gridx = 0;
		gbc.gridy = 6;
		gbc.fill = GridBagConstraints.HORIZONTAL;
		gbc.gridwidth = 2;
		JTextArea j16 = new JTextArea("FILTER(REMOVE)");
		j16.setEditable(false);
		j16.setPreferredSize(new Dimension(180,30));
		main_panel.add(j16, gbc);
		// ------------------
		gbc.gridx = 2;
		gbc.gridy = 6;
		gbc.fill = GridBagConstraints.HORIZONTAL;
		gbc.gridwidth = 1;
		final JCheckBox j17 = new JCheckBox("SET");
		j17.setPreferredSize(new Dimension(70,30));
		main_panel.add(j17, gbc);
		// -------------------
		gbc.gridx = 3;
		gbc.gridy = 6;
		gbc.fill = GridBagConstraints.HORIZONTAL;
		gbc.gridwidth = 5;
		final JTextField j18 = new JTextField("");
		j18.setPreferredSize(new Dimension(400,30));
		main_panel.add(j18, gbc);
		// --------------------
		
		
		// ACTION LISTENERS, set at the end to allow reference to other objects:
		j02.addActionListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				// CLEAR LOG
				debugHistory.clear();
				debugOutput.clear();
				UpdateText();
			}
		});
		j03.addActionListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				//RESET SELECTIONS
				j08.setSelected(false);
				j09.setText("");
				j11.setSelected(false);
				j12.setText("");
				j14.setSelected(false);
				j15.setText("");
				j17.setSelected(false);
				j18.setText("");
				
				highlightBlue = "";
				highlightRed = "";
				filterIn = "";
				filterOut = "";
				
				UpdateText();
				listApps_list.repaint();
			}
		});
		j04.addActionListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				// PAUSE
				isPaused = true;
				j04.setEnabled(false);
				j05.setEnabled(true);
			}
		});
		j05.addActionListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				// RESUME
				isPaused = false;
				j04.setEnabled(true);
				j05.setEnabled(false);
			}
		});
		j06.addActionListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				// EXPORT
				String actualDate = (new SimpleDateFormat("yyyyMMddHHmmss")).format(new Date(System.currentTimeMillis()));
				String textFileSimName = "SRTI_Debug_GUI_" + actualDate + ".txt";
				
				try {
					FileWriter exportFile;
					exportFile = new FileWriter(textFileSimName, true);
					for (int i = 0; i < debugOutput.size(); i++) {
						exportFile.write(debugOutput.get(i) + "\n");
					}
					exportFile.flush();
					exportFile.close();
				} catch (Exception e1) {
					
				}
			}
		});
		j08.addActionListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				// ENABLE BLUE HIGHLIGHT
				if (j08.isSelected() == true) {
					highlightBlue = j09.getText();
					listApps_list.repaint();
				} else {
					highlightBlue = "";
					listApps_list.repaint();
				}
			}
		});
		j09.addActionListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				// TEXT CHANGE BLUE HIGHLIGHT
				if (j08.isSelected() == true) {
					highlightBlue = j09.getText();
					listApps_list.repaint();
				} 
			}
		});
		j11.addActionListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				// ENABLE RED HIGHLIGHT
				if (j11.isSelected() == true) {
					highlightRed = j12.getText();
					listApps_list.repaint();
				} else {
					highlightRed = "";
					listApps_list.repaint();
				}
			}
		});
		j12.addActionListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				// TEXT CHANGE RED HIGHLIGHT
				if (j11.isSelected() == true) {
					highlightRed = j12.getText();
					listApps_list.repaint();
				} 
			}
		});
		j14.addActionListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				// ENABLE KEEP FILTER
				if (j14.isSelected() == true) {
					filterIn = j15.getText();
					UpdateText();
				} else {
					filterIn = "";
					UpdateText();
				}
			}
		});
		j15.addActionListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				// TEXT CHANGE KEEP FILTER
				if (j14.isSelected() == true) {
					filterIn = j15.getText();
					UpdateText();
				} 
			}
		});
		j17.addActionListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				// ENABLE REMOVE FILTER
				if (j17.isSelected() == true) {
					filterOut = j18.getText();
					UpdateText();
				} else {
					filterOut = "";
					UpdateText();
				}
			}
		});
		j18.addActionListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				// TEXT CHANGE REMOVE FILTER
				if (j17.isSelected() == true) {
					filterOut = j18.getText();
					UpdateText();
				} 
			}
		});
		
		
		// -------------------
		
		for (int i = 0; i < 8; i++) {
			gbc.gridx = i;
			gbc.gridy = 7;
			gbc.gridwidth = 1;
			JTextArea j00 = new JTextArea(" ");
			j00.setEditable(false);
			main_panel.add(j00, gbc);
		}
		
		listApps_scrollpane = new JScrollPane();
		listApps_list = new JList();
		//listApps_list.setListData(listApps_items_string);
		//listApps_list.addListSelectionListener(new ListAppSelectionHandler());
		listApps_list.setCellRenderer(new DefaultListCellRenderer() {
			@Override
			public Component getListCellRendererComponent(JList list, Object value, int index, boolean isSelected, boolean cellHasFocus) {
				Component c = super.getListCellRendererComponent(list,  value,  index,  isSelected, cellHasFocus);
				// check if "value" has filter text
				if (j11.isSelected() == true) {
					if (highlightRed.compareTo("") != 0) {
						// keep lines if they contain certain words: "||" means OR, allows multiple words
						String filterInEdit = highlightRed;
						boolean filterInMore = true;
						ArrayList<String> filterInWords = new ArrayList<String>();
						while (filterInMore == true) {
							int endIndex = filterInEdit.indexOf("||");
							if (endIndex == -1) {
								filterInWords.add(filterInEdit);
								filterInMore = false;
							} else {
								filterInWords.add(filterInEdit.substring(0, endIndex));
								filterInEdit = filterInEdit.substring(endIndex + 2, filterInEdit.length());
							}
						}
							for (int i = 0; i < filterInWords.size(); i++) {
								if (((String)value).contains(filterInWords.get(i)) == true) {
									setBackground(Color.RED);
								}
							}
						
					}
				}
				
				if (j08.isSelected() == true) {
					if (highlightBlue.compareTo("") != 0) {
						// keep lines if they contain certain words: "||" means OR, allows multiple words
						String filterInEdit = highlightBlue;
						boolean filterInMore = true;
						ArrayList<String> filterInWords = new ArrayList<String>();
						while (filterInMore == true) {
							int endIndex = filterInEdit.indexOf("||");
							if (endIndex == -1) {
								filterInWords.add(filterInEdit);
								filterInMore = false;
							} else {
								filterInWords.add(filterInEdit.substring(0, endIndex));
								filterInEdit = filterInEdit.substring(endIndex + 2, filterInEdit.length());
							}
						}
							for (int i = 0; i < filterInWords.size(); i++) {
								if (((String)value).contains(filterInWords.get(i)) == true) {
									setBackground(Color.BLUE);
								}
							}
						
					}
					
				}
				return c;
			}
		});
		listApps_scrollpane.setViewportView(listApps_list);
		listApps_scrollpane.setBorder(BorderFactory.createTitledBorder("Debug output:"));
		listApps_scrollpane.getVerticalScrollBar().addAdjustmentListener(new AdjustmentListener() {
			
			int previousLength = 0;
			
			public void adjustmentValueChanged(AdjustmentEvent e) {
				if (previousLength != e.getAdjustable().getMaximum()) {
					e.getAdjustable().setValue(e.getAdjustable().getMaximum());
					previousLength = e.getAdjustable().getMaximum();
				}
			}
		});
		listApps_scrollpane.setPreferredSize(new Dimension(800, 400));
		
		gbc.gridx = 0;
		gbc.gridy = 8;
		gbc.gridwidth = 8;
		gbc.gridheight = 10;
		main_panel.add(listApps_scrollpane, gbc);
		
		
		setContentPane(main_panel);
		setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
		setSize(width,height);
		setVisible(true);
	}
	
	
	public static void main (String [] args) {
		SwingUtilities.invokeLater(new Runnable() {
			@Override
			public void run() {
				ExampleDebugGUI gui = new ExampleDebugGUI();
				gui.setupPanel();
				
				for (int i = 0; i < 100; i++) {
					gui.UpdateText(i + " Hello");
					gui.UpdateText("Hello2aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
				}
			}
		});
	}
}
